import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

const colorClasses = {
  blue: {
    bg: 'bg-blue-100',
    icon: 'text-blue-600',
    trend: 'text-blue-600',
  },
  green: {
    bg: 'bg-green-100',
    icon: 'text-green-600',
    trend: 'text-green-600',
  },
  purple: {
    bg: 'bg-purple-100',
    icon: 'text-purple-600',
    trend: 'text-purple-600',
  },
  orange: {
    bg: 'bg-orange-100',
    icon: 'text-orange-600',
    trend: 'text-orange-600',
  },
  red: {
    bg: 'bg-red-100',
    icon: 'text-red-600',
    trend: 'text-red-600',
  },
  indigo: {
    bg: 'bg-indigo-100',
    icon: 'text-indigo-600',
    trend: 'text-indigo-600',
  },
  pink: {
    bg: 'bg-pink-100',
    icon: 'text-pink-600',
    trend: 'text-pink-600',
  },
  teal: {
    bg: 'bg-teal-100',
    icon: 'text-teal-600',
    trend: 'text-teal-600',
  },
};

const StatsCard = ({
  icon: Icon,
  value,
  label,
  trend,
  trendValue,
  trendLabel = 'vs last period',
  color = 'blue',
  onClick,
  className = '',
  loading = false,
}) => {
  const colors = colorClasses[color] || colorClasses.blue;

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
            <div className="h-8 bg-gray-200 rounded w-20" />
          </div>
          <div className="w-12 h-12 bg-gray-200 rounded-xl" />
        </div>
        <div className="mt-4 h-3 bg-gray-200 rounded w-32" />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-xl shadow-sm border border-gray-200 p-6
        transition-all duration-200
        ${onClick ? 'cursor-pointer hover:shadow-md hover:border-gray-300 active:scale-[0.98]' : ''}
        ${className}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 truncate">{label}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        
        {Icon && (
          <div className={`flex-shrink-0 p-3 rounded-xl ${colors.bg}`}>
            <Icon className={`h-6 w-6 ${colors.icon}`} />
          </div>
        )}
      </div>

      {(trend !== undefined || trendValue !== undefined) && (
        <div className="mt-4 flex items-center">
          {trend !== undefined && (
            <span
              className={`inline-flex items-center text-sm font-medium ${
                trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
              }`}
            >
              {trend === 'up' && <ArrowUpIcon className="h-4 w-4 mr-1" />}
              {trend === 'down' && <ArrowDownIcon className="h-4 w-4 mr-1" />}
              {trendValue && (
                <span>
                  {typeof trendValue === 'number' ? `${Math.abs(trendValue)}%` : trendValue}
                </span>
              )}
            </span>
          )}
          {trendLabel && (
            <span className="ml-2 text-sm text-gray-500">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
};

// Grid wrapper for multiple stats cards
StatsCard.Grid = ({ children, className = '' }) => (
  <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 ${className}`}>
    {children}
  </div>
);

export default StatsCard;
