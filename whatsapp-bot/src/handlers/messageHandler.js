import { apiService } from '../services/apiService.js';
import { geminiService } from '../services/geminiService.js';
import { logger } from '../services/logger.js';

const BOT_FOOTER = '\n\n─────────────────\n🏥 _DocClinic ERP_';

// Session storage for multi-step conversations
const sessions = new Map();

export async function handleMessage(client, message) {
  const senderPhone = message.from.replace('@c.us', '');
  const userMessage = message.body.trim();
  
  // Ignore status updates and empty messages
  if (message.isStatus || !userMessage) return;
  
  logger.info(`📨 From ${senderPhone}: ${userMessage}`);

  // Get or create session
  let session = sessions.get(senderPhone) || { step: null, data: {} };

  // Handle commands
  if (userMessage.startsWith('/')) {
    const response = await handleCommand(userMessage, senderPhone, session, message);
    if (response) {
      await message.reply(response + BOT_FOOTER);
    }
    return;
  }

  // Handle ongoing conversations
  if (session.step) {
    const response = await handleConversation(userMessage, senderPhone, session, message);
    if (response) {
      await message.reply(response + BOT_FOOTER);
    }
    return;
  }

  // Handle natural language queries using Gemini
  const response = await handleNaturalQuery(userMessage, senderPhone, message);
  await message.reply(response + BOT_FOOTER);
}

// ===========================================
// COMMAND HANDLERS
// ===========================================

async function handleCommand(message, phone, session, msg) {
  const [command, ...args] = message.toLowerCase().split(' ');

  switch (command) {
    case '/help':
      return getHelpMessage(session.role);

    case '/book':
      return startAppointmentBooking(phone, session);

    case '/status':
      return checkAppointmentStatus(phone, args.join(' '));

    case '/cancel':
      return cancelAppointment(phone, args[0]);

    case '/prescription':
      return getPrescription(phone, args[0]);

    // Staff commands
    case '/checkin':
      return staffCheckIn(phone);

    case '/checkout':
      return staffCheckOut(phone);

    case '/leave':
      return startLeaveRequest(phone, session);

    case '/attendance':
      return getAttendanceReport(phone);

    // Doctor commands
    case '/today':
      return getTodayAppointments(phone);

    case '/queue':
      return getQueueStatus(phone);

    case '/next':
      return callNextPatient(phone);

    case '/sendprescription':
      return sendPrescriptionToPatient(phone, args[0], args[1]);

    // Pharmacy commands
    case '/stock':
      return checkStock(args.join(' '));

    case '/lowstock':
      return getLowStockAlert(phone);

    case '/updatestock':
      return startStockUpdate(phone, session);

    // Reports (for authorized users)
    case '/report':
      return getReport(phone, args[0], args[1]);

    case '/sales':
      return getSalesReport(phone, args[0]);

    case '/opd':
      return getOPDCount(phone, args[0]);

    default:
      return '❓ Unknown command. Type */help* for available commands.';
  }
}

// ===========================================
// HELP MESSAGE
// ===========================================

function getHelpMessage(role) {
  let help = `📋 *DocClinic WhatsApp Bot*\n\n`;
  
  help += `*🗓️ Appointments*\n`;
  help += `• /book - Book new appointment\n`;
  help += `• /status - Check appointment status\n`;
  help += `• /cancel [id] - Cancel appointment\n\n`;

  help += `*💊 Prescriptions*\n`;
  help += `• /prescription [id] - Get prescription\n\n`;

  help += `*📦 Pharmacy*\n`;
  help += `• /stock [medicine] - Check stock\n`;
  help += `• /lowstock - Low stock alerts\n\n`;

  if (role === 'DOCTOR' || role === 'SUPER_ADMIN') {
    help += `*👨‍⚕️ Doctor Commands*\n`;
    help += `• /today - Today's appointments\n`;
    help += `• /queue - Current queue\n`;
    help += `• /next - Call next patient\n`;
    help += `• /sendprescription [rx-id] [phone] - Send prescription\n\n`;
  }

  if (role === 'STAFF' || role === 'RECEPTIONIST' || role === 'SUPER_ADMIN') {
    help += `*👥 Staff Commands*\n`;
    help += `• /checkin - Mark attendance\n`;
    help += `• /checkout - Check out\n`;
    help += `• /leave - Apply for leave\n`;
    help += `• /attendance - View attendance\n\n`;
  }

  if (role === 'PHARMACIST' || role === 'SUPER_ADMIN') {
    help += `*💊 Pharmacist Commands*\n`;
    help += `• /updatestock - Update stock (or send bill image)\n\n`;
  }

  if (role === 'ACCOUNTANT' || role === 'DOCTOR' || role === 'SUPER_ADMIN') {
    help += `*📊 Reports*\n`;
    help += `• /report [type] [period] - Get report\n`;
    help += `• /sales [today/week/month] - Sales report\n`;
    help += `• /opd [today/week/month] - OPD count\n\n`;
  }

  help += `💬 Or ask me anything in natural language!`;
  
  return help;
}

// ===========================================
// APPOINTMENT BOOKING
// ===========================================

function startAppointmentBooking(phone, session) {
  session.step = 'booking_name';
  session.data = { phone };
  sessions.set(phone, session);

  return `📅 *Book Appointment*\n\nPlease enter patient name:`;
}

// ===========================================
// CONVERSATION HANDLER
// ===========================================

async function handleConversation(message, phone, session, msg) {
  switch (session.step) {
    // Appointment booking flow
    case 'booking_name':
      session.data.name = message;
      session.step = 'booking_date';
      sessions.set(phone, session);
      return `👤 Name: *${message}*\n\nPlease enter preferred date:\n(Format: DD/MM/YYYY or "tomorrow", "day after tomorrow")`;

    case 'booking_date':
      const date = parseDate(message);
      if (!date) {
        return `❌ Invalid date format. Please use DD/MM/YYYY or say "tomorrow"`;
      }
      session.data.date = date;
      session.step = 'booking_time';
      sessions.set(phone, session);
      
      // Get available slots
      const slots = await apiService.getAvailableSlots(date);
      return `📅 Date: *${formatDate(date)}*\n\nAvailable time slots:\n${slots.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nEnter slot number or time:`;

    case 'booking_time':
      session.data.time = message;
      session.step = 'booking_symptoms';
      sessions.set(phone, session);
      return `⏰ Time: *${message}*\n\nPlease describe symptoms briefly (or type "skip"):`;

    case 'booking_symptoms':
      session.data.symptoms = message === 'skip' ? '' : message;
      session.step = null;
      
      // Create appointment
      try {
        const result = await apiService.createAppointment(session.data);
        sessions.delete(phone);
        return `✅ *Appointment Booked!*\n\n📋 Appointment No: *${result.appointmentNo}*\n👤 Patient: ${session.data.name}\n📅 Date: ${formatDate(session.data.date)}\n⏰ Time: ${session.data.time}\n\n_Please arrive 10 minutes early._\n_You will receive a reminder before your appointment._`;
      } catch (error) {
        sessions.delete(phone);
        return `❌ Failed to book appointment: ${error.message}`;
      }

    // Leave request flow
    case 'leave_type':
      session.data.leaveType = message.toUpperCase();
      session.step = 'leave_dates';
      sessions.set(phone, session);
      return `📝 Leave type: *${message}*\n\nEnter dates (From - To):\n(Format: DD/MM/YYYY - DD/MM/YYYY)`;

    case 'leave_dates':
      const dates = message.split('-').map(d => parseDate(d.trim()));
      if (dates.some(d => !d)) {
        return `❌ Invalid date format. Please use: DD/MM/YYYY - DD/MM/YYYY`;
      }
      session.data.startDate = dates[0];
      session.data.endDate = dates[1] || dates[0];
      session.step = 'leave_reason';
      sessions.set(phone, session);
      return `📅 Dates: *${formatDate(dates[0])}* to *${formatDate(dates[1] || dates[0])}*\n\nPlease enter reason for leave:`;

    case 'leave_reason':
      session.data.reason = message;
      session.step = null;
      
      try {
        const result = await apiService.applyLeave(phone, session.data);
        sessions.delete(phone);
        return `✅ *Leave Request Submitted*\n\n📋 Request ID: *${result.id}*\n📅 Dates: ${formatDate(session.data.startDate)} to ${formatDate(session.data.endDate)}\n📝 Reason: ${session.data.reason}\n\n_Waiting for approval._`;
      } catch (error) {
        sessions.delete(phone);
        return `❌ Failed to submit leave request: ${error.message}`;
      }

    // Stock update flow
    case 'stock_update_method':
      if (message === '1' || message.toLowerCase() === 'image') {
        session.step = 'stock_update_image';
        sessions.set(phone, session);
        return `📸 Please send the bill/invoice image.\n\nI'll extract the products and quantities automatically.`;
      } else {
        session.step = 'stock_update_manual';
        sessions.set(phone, session);
        return `📝 Enter product updates:\n(Format: Product Code, Quantity)\n\nExample:\nPAR500, +100\nCET10, +50\n\nType "done" when finished.`;
      }

    case 'stock_update_image':
      // This is handled separately for media messages
      return `❌ Please send an image of the bill/invoice.`;

    case 'stock_update_manual':
      if (message.toLowerCase() === 'done') {
        session.step = 'stock_update_confirm';
        sessions.set(phone, session);
        const preview = session.data.updates.map(u => `• ${u.code}: ${u.quantity > 0 ? '+' : ''}${u.quantity}`).join('\n');
        return `📋 *Stock Update Preview*\n\n${preview}\n\nConfirm update? (yes/no)`;
      }
      
      // Parse product update
      const parts = message.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        session.data.updates = session.data.updates || [];
        session.data.updates.push({
          code: parts[0],
          quantity: parseInt(parts[1])
        });
        return `✅ Added: ${parts[0]} (${parts[1]})\n\nAdd more or type "done":`;
      }
      return `❌ Invalid format. Use: Product Code, Quantity`;

    case 'stock_update_confirm':
      if (message.toLowerCase() === 'yes') {
        session.step = null;
        try {
          const result = await apiService.bulkUpdateStock(session.data.updates);
          sessions.delete(phone);
          return `✅ *Stock Updated Successfully*\n\n${result.updated} products updated.\n\n_Report sent to email._`;
        } catch (error) {
          sessions.delete(phone);
          return `❌ Failed to update stock: ${error.message}`;
        }
      } else {
        sessions.delete(phone);
        return `❌ Stock update cancelled.`;
      }

    default:
      sessions.delete(phone);
      return `❓ I didn't understand that. Type /help for available commands.`;
  }
}

// ===========================================
// NATURAL LANGUAGE HANDLER
// ===========================================

async function handleNaturalQuery(message, phone, msg) {
  // Check if it's a payment image
  if (msg.hasMedia) {
    const media = await msg.downloadMedia();
    if (media.mimetype.startsWith('image/')) {
      return await handlePaymentImage(media, phone);
    }
  }

  // Use Gemini for natural language understanding
  const intent = await geminiService.classifyIntent(message);
  
  switch (intent.type) {
    case 'BOOK_APPOINTMENT':
      return startAppointmentBooking(phone, sessions.get(phone) || { step: null, data: {} });
    
    case 'CHECK_STOCK':
      return checkStock(intent.medicine || message);
    
    case 'APPOINTMENT_STATUS':
      return checkAppointmentStatus(phone);
    
    case 'PRESCRIPTION':
      return getPrescription(phone);
    
    case 'GREETING':
      return `👋 Hello! Welcome to DocClinic.\n\nHow can I help you today?\n\n• Book appointment\n• Check stock\n• Get prescription\n• View reports\n\nOr type */help* for all commands.`;
    
    default:
      // Use Gemini to generate contextual response
      const response = await geminiService.generateResponse(message, phone);
      return response;
  }
}

// ===========================================
// PAYMENT IMAGE HANDLER (LLM-based)
// ===========================================

async function handlePaymentImage(media, phone) {
  try {
    // Use Gemini to analyze payment image
    const paymentData = await geminiService.analyzePaymentImage(media.data);
    
    if (!paymentData) {
      return `❌ Could not extract payment details from the image.\nPlease ensure the image is clear and shows the payment amount.`;
    }

    // Save payment record
    const result = await apiService.recordPayment({
      phone,
      amount: paymentData.amount,
      method: paymentData.method,
      reference: paymentData.reference,
      imageData: media.data
    });

    return `✅ *Payment Recorded*\n\n💰 Amount: ₹${paymentData.amount}\n💳 Method: ${paymentData.method}\n📝 Reference: ${paymentData.reference || 'N/A'}\n\n*Today's Summary:*\n• Consultations: ₹${result.todayConsultation}\n• Pharmacy Sales: ₹${result.todayPharmacy}\n• Total: ₹${result.todayTotal}`;
  } catch (error) {
    logger.error('Payment image processing error:', error);
    return `❌ Failed to process payment image: ${error.message}`;
  }
}

// ===========================================
// API COMMAND HANDLERS
// ===========================================

async function checkAppointmentStatus(phone, appointmentId) {
  try {
    const appointments = await apiService.getPatientAppointments(phone, appointmentId);
    
    if (!appointments.length) {
      return `📅 No appointments found.\n\nWant to book one? Type */book*`;
    }

    let response = `📋 *Your Appointments*\n\n`;
    appointments.forEach(apt => {
      response += `*${apt.appointmentNo}*\n`;
      response += `📅 ${formatDate(apt.date)} at ${apt.timeSlot}\n`;
      response += `📍 Status: ${formatStatus(apt.status)}\n\n`;
    });

    return response;
  } catch (error) {
    return `❌ Could not fetch appointments: ${error.message}`;
  }
}

async function checkStock(medicine) {
  try {
    const stock = await apiService.checkStock(medicine);
    
    if (!stock) {
      return `❌ No product found matching "${medicine}"`;
    }

    return `💊 *${stock.name}*\n\n📦 Stock: ${stock.quantity} ${stock.unit}\n💰 MRP: ₹${stock.mrp}\n📅 Expiry: ${stock.expiryDate ? formatDate(stock.expiryDate) : 'N/A'}\n${stock.quantity <= stock.minStock ? '⚠️ _Low stock alert!_' : ''}`;
  } catch (error) {
    return `❌ Could not check stock: ${error.message}`;
  }
}

async function getTodayAppointments(phone) {
  try {
    const appointments = await apiService.getTodayAppointments();
    
    if (!appointments.length) {
      return `📅 No appointments scheduled for today.`;
    }

    let response = `📋 *Today's Appointments*\n\n`;
    response += `Total: ${appointments.length}\n\n`;
    
    appointments.forEach((apt, i) => {
      response += `${i + 1}. *${apt.patient.name}* (${apt.patient.patientId})\n`;
      response += `   ⏰ ${apt.timeSlot} | ${formatStatus(apt.status)}\n`;
    });

    return response;
  } catch (error) {
    return `❌ Could not fetch appointments: ${error.message}`;
  }
}

async function staffCheckIn(phone) {
  try {
    const result = await apiService.markAttendance(phone, 'checkin');
    return `✅ *Checked In*\n\n⏰ Time: ${formatTime(new Date())}\n📅 Date: ${formatDate(new Date())}\n\nHave a productive day! 💪`;
  } catch (error) {
    return `❌ Check-in failed: ${error.message}`;
  }
}

async function staffCheckOut(phone) {
  try {
    const result = await apiService.markAttendance(phone, 'checkout');
    return `✅ *Checked Out*\n\n⏰ Time: ${formatTime(new Date())}\n⏱️ Hours worked: ${result.hoursWorked}\n\nSee you tomorrow! 👋`;
  } catch (error) {
    return `❌ Check-out failed: ${error.message}`;
  }
}

function startLeaveRequest(phone, session) {
  session.step = 'leave_type';
  session.data = { phone };
  sessions.set(phone, session);

  return `📝 *Apply for Leave*\n\nSelect leave type:\n1. Casual\n2. Sick\n3. Earned\n4. Unpaid`;
}

function startStockUpdate(phone, session) {
  session.step = 'stock_update_method';
  session.data = { updates: [] };
  sessions.set(phone, session);

  return `📦 *Update Stock*\n\nHow would you like to update?\n\n1. Send bill/invoice image\n2. Enter manually\n\nReply with 1 or 2:`;
}

async function getSalesReport(phone, period = 'today') {
  try {
    const report = await apiService.getSalesReport(period);
    
    return `📊 *Sales Report - ${period.charAt(0).toUpperCase() + period.slice(1)}*\n\n💰 Total Sales: ₹${report.totalSales}\n🏥 Consultations: ₹${report.consultations}\n💊 Pharmacy: ₹${report.pharmacy}\n🔬 Lab Tests: ₹${report.labTests}\n\n📈 Growth: ${report.growth > 0 ? '+' : ''}${report.growth}%`;
  } catch (error) {
    return `❌ Could not fetch report: ${error.message}`;
  }
}

async function getOPDCount(phone, period = 'today') {
  try {
    const report = await apiService.getOPDReport(period);
    
    return `📊 *OPD Report - ${period.charAt(0).toUpperCase() + period.slice(1)}*\n\n👥 Total Patients: ${report.total}\n✅ Completed: ${report.completed}\n❌ Cancelled: ${report.cancelled}\n⏳ Pending: ${report.pending}\n\n📈 Growth: ${report.growth > 0 ? '+' : ''}${report.growth}%`;
  } catch (error) {
    return `❌ Could not fetch report: ${error.message}`;
  }
}

async function getLowStockAlert(phone) {
  try {
    const products = await apiService.getLowStockProducts();
    
    if (!products.length) {
      return `✅ All products are well stocked!`;
    }

    let response = `⚠️ *Low Stock Alert*\n\n`;
    products.forEach(p => {
      response += `• *${p.name}* (${p.code})\n  Stock: ${p.quantity} ${p.unit} (Min: ${p.minStock})\n`;
    });

    return response;
  } catch (error) {
    return `❌ Could not fetch low stock: ${error.message}`;
  }
}

async function getPrescription(phone, prescriptionId) {
  try {
    const prescription = prescriptionId 
      ? await apiService.getPrescription(prescriptionId)
      : await apiService.getLatestPrescription(phone);
    
    if (!prescription) {
      return `❌ No prescription found.`;
    }

    let response = `📋 *Prescription*\n\n`;
    response += `🆔 ${prescription.prescriptionNo}\n`;
    response += `📅 ${formatDate(prescription.date)}\n`;
    response += `👤 ${prescription.patient.name}\n\n`;
    
    response += `*Diagnosis:* ${prescription.diagnosis.join(', ')}\n\n`;
    
    response += `*Medicines:*\n`;
    prescription.medicines.forEach((m, i) => {
      response += `${i + 1}. ${m.medicineName} ${m.dosage}\n`;
      response += `   ${m.frequency} for ${m.duration}\n`;
    });

    if (prescription.advice) {
      response += `\n*Advice:* ${prescription.advice}`;
    }

    return response;
  } catch (error) {
    return `❌ Could not fetch prescription: ${error.message}`;
  }
}

async function sendPrescriptionToPatient(phone, prescriptionId, patientPhone) {
  try {
    const result = await apiService.sendPrescription(prescriptionId, patientPhone);
    return `✅ Prescription sent to ${patientPhone} via WhatsApp${result.emailSent ? ' and email' : ''}.`;
  } catch (error) {
    return `❌ Failed to send prescription: ${error.message}`;
  }
}

async function cancelAppointment(phone, appointmentId) {
  if (!appointmentId) {
    return `❌ Please provide appointment ID.\nUsage: /cancel A-0001`;
  }
  
  try {
    await apiService.cancelAppointment(appointmentId, phone);
    return `✅ Appointment *${appointmentId}* has been cancelled.`;
  } catch (error) {
    return `❌ Could not cancel: ${error.message}`;
  }
}

async function getQueueStatus(phone) {
  try {
    const queue = await apiService.getQueue();
    
    if (!queue.length) {
      return `✅ No patients in queue.`;
    }

    let response = `👥 *Current Queue*\n\n`;
    queue.forEach((p, i) => {
      response += `${i + 1}. ${p.patient.name} (${p.appointmentNo})\n`;
      response += `   ⏰ ${p.timeSlot} | ${p.waitTime} mins wait\n`;
    });

    return response;
  } catch (error) {
    return `❌ Could not fetch queue: ${error.message}`;
  }
}

async function callNextPatient(phone) {
  try {
    const result = await apiService.callNextPatient();
    return `📣 *Calling Next Patient*\n\n👤 ${result.patient.name}\n🆔 ${result.patient.patientId}\n\n_Patient has been notified._`;
  } catch (error) {
    return `❌ ${error.message}`;
  }
}

async function getAttendanceReport(phone) {
  try {
    const report = await apiService.getAttendanceReport(phone);
    
    return `📊 *Attendance - This Month*\n\n✅ Present: ${report.present} days\n🔴 Absent: ${report.absent} days\n🌴 Leaves: ${report.leaves} days\n⏱️ Total Hours: ${report.totalHours}`;
  } catch (error) {
    return `❌ Could not fetch attendance: ${error.message}`;
  }
}

async function getReport(phone, type, period = 'today') {
  switch (type?.toLowerCase()) {
    case 'sales':
      return getSalesReport(phone, period);
    case 'opd':
      return getOPDCount(phone, period);
    default:
      return `📊 Available reports:\n• /report sales [today/week/month]\n• /report opd [today/week/month]`;
  }
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

function parseDate(str) {
  if (!str) return null;
  
  const lower = str.toLowerCase().trim();
  const today = new Date();
  
  if (lower === 'today') return today;
  if (lower === 'tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  if (lower === 'day after tomorrow') {
    const dat = new Date(today);
    dat.setDate(dat.getDate() + 2);
    return dat;
  }
  
  // Try DD/MM/YYYY format
  const parts = str.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [day, month, year] = parts.map(Number);
    return new Date(year, month - 1, day);
  }
  
  return null;
}

function formatDate(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatStatus(status) {
  const statusMap = {
    SCHEDULED: '📅 Scheduled',
    CONFIRMED: '✅ Confirmed',
    IN_QUEUE: '⏳ In Queue',
    IN_PROGRESS: '🔄 In Progress',
    COMPLETED: '✅ Completed',
    CANCELLED: '❌ Cancelled',
    NO_SHOW: '⚠️ No Show'
  };
  return statusMap[status] || status;
}
