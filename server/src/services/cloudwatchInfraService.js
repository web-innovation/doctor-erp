const CACHE_TTL_MS = 60 * 1000;

let cache = {
  expiresAt: 0,
  value: null,
  pending: null,
};

const RDS_INSTANCE_MEMORY_BYTES_MAP = {
  'db.t3.micro': 1 * 1024 * 1024 * 1024,
  'db.t3.small': 2 * 1024 * 1024 * 1024,
  'db.t3.medium': 4 * 1024 * 1024 * 1024,
  'db.t3.large': 8 * 1024 * 1024 * 1024,
  'db.t3.xlarge': 16 * 1024 * 1024 * 1024,
  'db.t3.2xlarge': 32 * 1024 * 1024 * 1024,
  'db.t4g.micro': 1 * 1024 * 1024 * 1024,
  'db.t4g.small': 2 * 1024 * 1024 * 1024,
  'db.t4g.medium': 4 * 1024 * 1024 * 1024,
  'db.t4g.large': 8 * 1024 * 1024 * 1024,
  'db.t4g.xlarge': 16 * 1024 * 1024 * 1024,
  'db.t4g.2xlarge': 32 * 1024 * 1024 * 1024,
  'db.m5.large': 8 * 1024 * 1024 * 1024,
  'db.m5.xlarge': 16 * 1024 * 1024 * 1024,
  'db.m5.2xlarge': 32 * 1024 * 1024 * 1024,
  'db.m5.4xlarge': 64 * 1024 * 1024 * 1024,
  'db.m5.8xlarge': 128 * 1024 * 1024 * 1024,
  'db.m6g.large': 8 * 1024 * 1024 * 1024,
  'db.m6g.xlarge': 16 * 1024 * 1024 * 1024,
  'db.m6g.2xlarge': 32 * 1024 * 1024 * 1024,
  'db.r5.large': 16 * 1024 * 1024 * 1024,
  'db.r5.xlarge': 32 * 1024 * 1024 * 1024,
  'db.r5.2xlarge': 64 * 1024 * 1024 * 1024,
  'db.r6g.large': 16 * 1024 * 1024 * 1024,
  'db.r6g.xlarge': 32 * 1024 * 1024 * 1024,
  'db.r6g.2xlarge': 64 * 1024 * 1024 * 1024,
};

function clampPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n * 100) / 100;
}

function averageDatapoints(datapoints) {
  if (!Array.isArray(datapoints) || datapoints.length === 0) return null;
  const values = datapoints
    .map((d) => Number(d?.Average))
    .filter((n) => Number.isFinite(n));
  if (!values.length) return null;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

async function getImdsToken() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1000);
  try {
    const res = await fetch('http://169.254.169.254/latest/api/token', {
      method: 'PUT',
      headers: { 'X-aws-ec2-metadata-token-ttl-seconds': '60' },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.text()) || null;
  } catch (_err) {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getEc2InstanceId() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1000);
  try {
    const token = await getImdsToken();
    const headers = token ? { 'X-aws-ec2-metadata-token': token } : {};
    const res = await fetch('http://169.254.169.254/latest/meta-data/instance-id', {
      headers,
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.text()) || null;
  } catch (_err) {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseDbHost(databaseUrl) {
  if (!databaseUrl) return null;
  try {
    return new URL(databaseUrl).hostname || null;
  } catch (_err) {
    return null;
  }
}

async function getAwsClients(region) {
  const [{ CloudWatchClient, GetMetricStatisticsCommand }, { RDSClient, DescribeDBInstancesCommand }] =
    await Promise.all([
      import('@aws-sdk/client-cloudwatch'),
      import('@aws-sdk/client-rds'),
    ]);
  return {
    cw: new CloudWatchClient({ region }),
    rds: new RDSClient({ region }),
    GetMetricStatisticsCommand,
    DescribeDBInstancesCommand,
  };
}

async function getMetricAverage(cw, GetMetricStatisticsCommand, { namespace, metricName, dimensions, unit }) {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - (15 * 60 * 1000));
  const cmd = new GetMetricStatisticsCommand({
    Namespace: namespace,
    MetricName: metricName,
    Dimensions: dimensions,
    StartTime: startTime,
    EndTime: endTime,
    Period: 300,
    Statistics: ['Average'],
    Unit: unit,
  });
  const res = await cw.send(cmd);
  return averageDatapoints(res?.Datapoints);
}

async function findRdsInstanceByEndpoint(rds, DescribeDBInstancesCommand, dbHost) {
  if (!dbHost) return null;
  const needle = dbHost.toLowerCase();
  let marker;
  for (;;) {
    const res = await rds.send(new DescribeDBInstancesCommand({ Marker: marker }));
    const list = Array.isArray(res?.DBInstances) ? res.DBInstances : [];
    const found = list.find((db) => {
      const endpoint = db?.Endpoint?.Address;
      if (!endpoint) return false;
      const ep = endpoint.toLowerCase();
      return ep === needle || ep.includes(needle) || needle.includes(ep);
    });
    if (found) return found;
    marker = res?.Marker;
    if (!marker) break;
  }
  return null;
}

async function findRdsInstanceByIdentifier(rds, DescribeDBInstancesCommand, dbInstanceIdentifier) {
  if (!dbInstanceIdentifier) return null;
  try {
    const res = await rds.send(new DescribeDBInstancesCommand({ DBInstanceIdentifier: dbInstanceIdentifier }));
    const list = Array.isArray(res?.DBInstances) ? res.DBInstances : [];
    return list[0] || null;
  } catch (_err) {
    return null;
  }
}

async function fetchCloudwatchInfraUtilization({ region, databaseUrl, rdsDbInstanceIdentifier }) {
  const result = {
    source: 'cloudwatch',
    instance: { cpuPercent: null, memoryPercent: null, instanceId: null },
    rds: { cpuPercent: null, memoryPercent: null, dbInstanceIdentifier: null, endpointMatchUsed: false, debug: null },
  };

  const { cw, rds, GetMetricStatisticsCommand, DescribeDBInstancesCommand } = await getAwsClients(region);

  const [instanceId, dbHost] = await Promise.all([
    getEc2InstanceId(),
    Promise.resolve(parseDbHost(databaseUrl)),
  ]);

  result.instance.instanceId = instanceId;

  if (instanceId) {
    const ec2Dims = [{ Name: 'InstanceId', Value: instanceId }];
    const [ec2Cpu, ec2Mem] = await Promise.all([
      getMetricAverage(cw, GetMetricStatisticsCommand, {
        namespace: 'AWS/EC2',
        metricName: 'CPUUtilization',
        dimensions: ec2Dims,
        unit: 'Percent',
      }).catch(() => null),
      getMetricAverage(cw, GetMetricStatisticsCommand, {
        namespace: 'CWAgent',
        metricName: 'mem_used_percent',
        dimensions: ec2Dims,
        unit: 'Percent',
      }).catch(() => null),
    ]);
    result.instance.cpuPercent = clampPercent(ec2Cpu);
    result.instance.memoryPercent = clampPercent(ec2Mem);
  }

  let db = await findRdsInstanceByIdentifier(rds, DescribeDBInstancesCommand, rdsDbInstanceIdentifier).catch((err) => {
    result.rds.debug = `describe-by-id-failed:${err?.name || 'error'}`;
    return null;
  });
  const guessedDbIdentifier = dbHost ? dbHost.split('.')[0] : null;
  if (!db && guessedDbIdentifier && guessedDbIdentifier !== rdsDbInstanceIdentifier) {
    db = await findRdsInstanceByIdentifier(rds, DescribeDBInstancesCommand, guessedDbIdentifier).catch(() => null);
    if (db) result.rds.debug = 'resolved-by-guessed-id';
  }
  if (!db) {
    db = await findRdsInstanceByEndpoint(rds, DescribeDBInstancesCommand, dbHost).catch((err) => {
      result.rds.debug = `describe-by-endpoint-failed:${err?.name || 'error'}`;
      return null;
    });
    if (db) result.rds.endpointMatchUsed = true;
  }
  if (db?.DBInstanceIdentifier) {
    const dbId = db.DBInstanceIdentifier;
    result.rds.dbInstanceIdentifier = dbId;
    const rdsDims = [{ Name: 'DBInstanceIdentifier', Value: dbId }];

    const [rdsCpu, rdsFreeableMemBytes] = await Promise.all([
      getMetricAverage(cw, GetMetricStatisticsCommand, {
        namespace: 'AWS/RDS',
        metricName: 'CPUUtilization',
        dimensions: rdsDims,
        unit: 'Percent',
      }).catch(() => null),
      getMetricAverage(cw, GetMetricStatisticsCommand, {
        namespace: 'AWS/RDS',
        metricName: 'FreeableMemory',
        dimensions: rdsDims,
        unit: 'Bytes',
      }).catch(() => null),
    ]);

    result.rds.cpuPercent = clampPercent(rdsCpu);
    if (result.rds.debug == null) result.rds.debug = 'resolved';

    const classKey = String(db.DBInstanceClass || '').toLowerCase();
    const totalMemBytes = RDS_INSTANCE_MEMORY_BYTES_MAP[classKey] || null;
    if (Number.isFinite(rdsFreeableMemBytes) && Number.isFinite(totalMemBytes) && totalMemBytes > 0) {
      const usedPct = ((totalMemBytes - rdsFreeableMemBytes) / totalMemBytes) * 100;
      result.rds.memoryPercent = clampPercent(usedPct);
    }
  } else {
    result.rds.debug = result.rds.debug || 'rds-instance-not-resolved';
  }

  return result;
}

export async function getCloudwatchInfraUtilization({ region, databaseUrl, rdsDbInstanceIdentifier }) {
  const now = Date.now();
  if (cache.value && now < cache.expiresAt) return cache.value;
  if (cache.pending) return cache.pending;

  cache.pending = fetchCloudwatchInfraUtilization({ region, databaseUrl, rdsDbInstanceIdentifier })
    .then((value) => {
      cache.value = value;
      cache.expiresAt = Date.now() + CACHE_TTL_MS;
      return value;
    })
    .catch((error) => {
      cache.value = null;
      cache.expiresAt = 0;
      throw error;
    })
    .finally(() => {
      cache.pending = null;
    });

  return cache.pending;
}
