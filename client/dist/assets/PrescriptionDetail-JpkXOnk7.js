import{T as B,u as E,r as G,p as O,j as e,l as R,a5 as V,a6 as Q,g as X,$ as _,a8 as K,a9 as Y,aa as Z,Z as J,ab as ee,Q as se,a7 as te,n as ae,z as x}from"./index-DPyX6QYN.js";import{p as w}from"./prescriptionService-CpssHxuR.js";function re(){var h,b,v,f,u;const{id:d}=B(),m=E(),[$,n]=G.useState(!1),{data:o,isLoading:D,error:P}=O({queryKey:["prescription",d],queryFn:()=>w.getPrescription(d),enabled:!!d}),t=o==null?void 0:o.data,k=s=>{if(!s||Object.keys(s).length===0)return"";let a="";return s.bp&&(a+=`<div class="vital-item"><div class="value">${s.bp}</div><div class="label">BP (mmHg)</div></div>`),s.pulse&&(a+=`<div class="vital-item"><div class="value">${s.pulse}</div><div class="label">Pulse (bpm)</div></div>`),s.temp&&(a+=`<div class="vital-item"><div class="value">${s.temp}</div><div class="label">Temp (°F)</div></div>`),s.spo2&&(a+=`<div class="vital-item"><div class="value">${s.spo2}%</div><div class="label">SpO2</div></div>`),s.weight&&(a+=`<div class="vital-item"><div class="value">${s.weight}</div><div class="label">Weight (kg)</div></div>`),`
      <div class="vitals-section">
        <h3>Vitals</h3>
        <div class="vitals-grid">${a}</div>
      </div>
    `},S=s=>!Array.isArray(s)||s.length===0?"":`
      <div class="section">
        <div class="section-title">Diagnosis</div>
        <div class="diagnosis-tags">${s.map(i=>`<span class="diagnosis-tag">${i}</span>`).join("")}</div>
      </div>
    `,F=s=>!s||s.length===0?"":`
      <div class="section">
        <div class="section-title">℞ Medicines</div>
        <table>
          <thead>
            <tr>
              <th style="width:5%">#</th>
              <th style="width:30%">Medicine</th>
              <th style="width:15%">Dosage</th>
              <th style="width:15%">Frequency</th>
              <th style="width:15%">Duration</th>
              <th style="width:20%">Timing</th>
            </tr>
          </thead>
          <tbody>${s.map((i,r)=>`
      <tr>
        <td>${r+1}</td>
        <td>
          <div class="medicine-name">${i.medicineName}</div>
          ${i.genericName?`<div class="generic-name">${i.genericName}</div>`:""}
        </td>
        <td>${i.dosage||"-"}</td>
        <td>${i.frequency||"-"}</td>
        <td>${i.duration||"-"}</td>
        <td>${i.timing||"-"}</td>
      </tr>
    `).join("")}</tbody>
        </table>
      </div>
    `,z=s=>!s||s.length===0?"":`
      <div class="section">
        <div class="section-title">Lab Tests</div>
        <div class="lab-tests">${s.map((i,r)=>`
      <div class="lab-test-item">
        <div class="lab-test-name">${r+1}. ${i.testName}</div>
        ${i.instructions?`<div class="lab-instructions">${i.instructions}</div>`:""}
      </div>
    `).join("")}</div>
      </div>
    `,A=()=>{var j,N,y;if(!t)return;const s=window.open("","_blank"),a=t.prescriptionNo||"RX"+String(t.id).padStart(5,"0"),i=new Date(t.createdAt).toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"}),r=((j=t.patient)==null?void 0:j.name)||"N/A",H=((N=t.patient)==null?void 0:N.patientId)||"N/A",T=((y=t.patient)==null?void 0:y.phone)||"N/A",C=k(t.vitalsSnapshot),I=S(t.diagnosis),L=F(t.medicines),M=z(t.labTests),U=t.clinicalNotes?`
      <div class="section">
        <div class="section-title">Clinical Notes</div>
        <div class="notes-box"><p>${t.clinicalNotes}</p></div>
      </div>
    `:"",W=t.advice?`
      <div class="section">
        <div class="section-title">Advice</div>
        <div class="advice-box"><p>${t.advice}</p></div>
      </div>
    `:"",q=t.followUpDate?`
      <div class="followup">
        <div class="followup-label">Follow-up Date</div>
        <div class="followup-date">${new Date(t.followUpDate).toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"})}</div>
      </div>
    `:"<div></div>";s.document.write(`
      <html>
        <head>
          <title>Prescription - ${a}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              padding: 30px; 
              max-width: 800px; 
              margin: 0 auto;
              color: #333;
              line-height: 1.5;
            }
            .prescription-container {
              border: 2px solid #2563eb;
              border-radius: 8px;
              overflow: hidden;
            }
            .header { 
              background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
              color: white;
              padding: 20px 30px;
              text-align: center;
            }
            .clinic-name { font-size: 28px; font-weight: bold; margin-bottom: 5px; }
            .clinic-info { font-size: 12px; opacity: 0.9; }
            .content { padding: 25px 30px; position: relative; }
            .prescription-no { text-align: right; font-size: 14px; color: #666; margin-bottom: 15px; }
            .patient-card {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 15px 20px;
              margin-bottom: 20px;
            }
            .patient-card h3 {
              color: #2563eb;
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 10px;
            }
            .patient-details {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
            }
            .detail-item label { font-size: 11px; color: #64748b; display: block; }
            .detail-item span { font-size: 14px; font-weight: 600; color: #1e293b; }
            .vitals-section {
              background: #fef3c7;
              border: 1px solid #fbbf24;
              border-radius: 8px;
              padding: 15px 20px;
              margin-bottom: 20px;
            }
            .vitals-section h3 {
              color: #b45309;
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 10px;
            }
            .vitals-grid {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 10px;
            }
            .vital-item {
              background: white;
              padding: 10px;
              border-radius: 6px;
              text-align: center;
            }
            .vital-item .value { font-size: 18px; font-weight: bold; color: #b45309; }
            .vital-item .label { font-size: 10px; color: #666; text-transform: uppercase; }
            .section { margin-bottom: 20px; }
            .section-title {
              font-size: 14px;
              font-weight: bold;
              color: #2563eb;
              text-transform: uppercase;
              letter-spacing: 1px;
              padding-bottom: 8px;
              border-bottom: 2px solid #e2e8f0;
              margin-bottom: 15px;
            }
            .diagnosis-tags { display: flex; flex-wrap: wrap; gap: 8px; }
            .diagnosis-tag {
              background: #dbeafe;
              color: #1e40af;
              padding: 6px 12px;
              border-radius: 20px;
              font-size: 13px;
              font-weight: 500;
            }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th { 
              background: #f1f5f9;
              color: #475569;
              font-weight: 600;
              text-transform: uppercase;
              font-size: 11px;
              letter-spacing: 0.5px;
              padding: 12px 10px;
              text-align: left;
              border-bottom: 2px solid #e2e8f0;
            }
            td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
            tr:last-child td { border-bottom: none; }
            .medicine-name { font-weight: 600; color: #1e293b; }
            .generic-name { font-size: 11px; color: #64748b; font-style: italic; }
            .lab-tests { display: grid; gap: 10px; }
            .lab-test-item {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 10px 15px;
              border-radius: 0 6px 6px 0;
            }
            .lab-test-name { font-weight: 600; color: #92400e; }
            .lab-instructions { font-size: 12px; color: #78350f; }
            .advice-box {
              background: #ecfdf5;
              border: 1px solid #10b981;
              border-radius: 8px;
              padding: 15px;
            }
            .advice-box p { color: #065f46; white-space: pre-wrap; }
            .notes-box {
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 15px;
            }
            .notes-box p { color: #475569; white-space: pre-wrap; }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px dashed #cbd5e1;
              display: flex;
              justify-content: space-between;
            }
            .followup { background: #dbeafe; padding: 10px 15px; border-radius: 6px; }
            .followup-label { font-size: 11px; color: #3b82f6; text-transform: uppercase; }
            .followup-date { font-weight: bold; color: #1e40af; }
            .signature { text-align: right; }
            .signature-line { border-top: 1px solid #333; width: 200px; margin-left: auto; margin-bottom: 5px; }
            .doctor-name { font-weight: bold; }
            @media print { 
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
              .prescription-container { border: 1px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="prescription-container">
            <div class="header">
              <div class="clinic-name">Docsy ERP</div>
              <div class="clinic-info">Your Trusted Healthcare Partner | Phone: +91 9876543210</div>
            </div>
            <div class="content">
              <div class="prescription-no">
                <strong>${a}</strong>&nbsp;|&nbsp;${i}
              </div>
              
              <div class="patient-card">
                <h3>Patient Information</h3>
                <div class="patient-details">
                  <div class="detail-item"><label>Name</label><span>${r}</span></div>
                  <div class="detail-item"><label>Patient ID</label><span>${H}</span></div>
                  <div class="detail-item"><label>Phone</label><span>${T}</span></div>
                  <div class="detail-item"><label>Date</label><span>${new Date(t.createdAt).toLocaleDateString("en-IN")}</span></div>
                </div>
              </div>

              ${C}
              ${I}
              ${U}
              ${L}
              ${M}
              ${W}

              <div class="footer">
                ${q}
                <div class="signature">
                  <div class="signature-line"></div>
                  <div class="doctor-name">Doctor's Signature</div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `),s.document.close(),s.onload=()=>{s.print()}},g=async s=>{var a,i;try{const r=await w.sendPrescription(d,s);r.whatsappUrl?(window.open(r.whatsappUrl,"_blank"),x.success("WhatsApp opened. Send the message to complete.")):x.success(`Prescription sent via ${s}`),n(!1)}catch(r){x.error(((i=(a=r.response)==null?void 0:a.data)==null?void 0:i.message)||"Failed to send prescription")}},c=s=>s?new Date(s).toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"}):"-";if(D)return e.jsx("div",{className:"min-h-screen bg-gray-50 p-6 flex items-center justify-center",children:e.jsx("div",{className:"animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"})});if(P||!t)return e.jsx("div",{className:"min-h-screen bg-gray-50 p-6",children:e.jsxs("div",{className:"max-w-4xl mx-auto text-center py-12",children:[e.jsx("p",{className:"text-red-600 mb-4",children:"Failed to load prescription"}),e.jsx("button",{onClick:()=>m("/prescriptions"),className:"text-blue-600 hover:underline",children:"Back to Prescriptions"})]})});const l=t.vitalsSnapshot||{},p=Array.isArray(t.diagnosis)?t.diagnosis:[];return e.jsx("div",{className:"min-h-screen bg-gray-50 p-6",children:e.jsxs("div",{className:"max-w-4xl mx-auto",children:[e.jsxs("div",{className:"flex items-center justify-between mb-6",children:[e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsx("button",{onClick:()=>m("/prescriptions"),className:"p-2 hover:bg-gray-100 rounded-lg transition",children:e.jsx(R,{className:"text-gray-600"})}),e.jsxs("div",{children:[e.jsx("h1",{className:"text-2xl font-bold text-gray-900",children:t.prescriptionNo||`RX${String(t.id).padStart(5,"0")}`}),e.jsx("p",{className:"text-gray-500 mt-1",children:c(t.createdAt)})]})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsxs("button",{onClick:A,className:"inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition",children:[e.jsx(V,{}),"Print"]}),e.jsxs("button",{onClick:()=>n(!0),className:"inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition",children:[e.jsx(Q,{}),"Send"]})]})]}),e.jsxs("div",{id:"prescription-print-area",className:"space-y-6",children:[e.jsxs("div",{className:"bg-white rounded-xl shadow-sm border border-gray-100 p-6",children:[e.jsxs("div",{className:"flex items-center gap-2 text-blue-600 mb-4",children:[e.jsx(X,{}),e.jsx("h2",{className:"text-lg font-semibold",children:"Patient Information"})]}),e.jsxs("div",{className:"grid grid-cols-2 md:grid-cols-4 gap-4",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-sm text-gray-500",children:"Name"}),e.jsx("p",{className:"font-medium",children:((h=t.patient)==null?void 0:h.name)||"N/A"})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-sm text-gray-500",children:"Patient ID"}),e.jsx("p",{className:"font-medium",children:((b=t.patient)==null?void 0:b.patientId)||"N/A"})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-sm text-gray-500",children:"Phone"}),e.jsx("p",{className:"font-medium",children:((v=t.patient)==null?void 0:v.phone)||"N/A"})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-sm text-gray-500",children:"Date"}),e.jsx("p",{className:"font-medium",children:c(t.createdAt)})]})]})]}),(l.bp||l.pulse||l.temp||l.spo2||l.weight)&&e.jsxs("div",{className:"bg-white rounded-xl shadow-sm border border-gray-100 p-6",children:[e.jsxs("div",{className:"flex items-center gap-2 text-red-600 mb-4",children:[e.jsx(_,{}),e.jsx("h2",{className:"text-lg font-semibold",children:"Vitals"})]}),e.jsxs("div",{className:"grid grid-cols-2 md:grid-cols-5 gap-4",children:[l.bp&&e.jsxs("div",{className:"bg-gray-50 p-3 rounded-lg",children:[e.jsx("p",{className:"text-xs text-gray-500",children:"Blood Pressure"}),e.jsx("p",{className:"text-lg font-semibold text-gray-900",children:l.bp})]}),l.pulse&&e.jsxs("div",{className:"bg-gray-50 p-3 rounded-lg",children:[e.jsx("p",{className:"text-xs text-gray-500",children:"Pulse"}),e.jsxs("p",{className:"text-lg font-semibold text-gray-900",children:[l.pulse," bpm"]})]}),l.temp&&e.jsxs("div",{className:"bg-gray-50 p-3 rounded-lg",children:[e.jsx("p",{className:"text-xs text-gray-500",children:"Temperature"}),e.jsxs("p",{className:"text-lg font-semibold text-gray-900",children:[l.temp,"°F"]})]}),l.spo2&&e.jsxs("div",{className:"bg-gray-50 p-3 rounded-lg",children:[e.jsx("p",{className:"text-xs text-gray-500",children:"SpO2"}),e.jsxs("p",{className:"text-lg font-semibold text-gray-900",children:[l.spo2,"%"]})]}),l.weight&&e.jsxs("div",{className:"bg-gray-50 p-3 rounded-lg",children:[e.jsx("p",{className:"text-xs text-gray-500",children:"Weight"}),e.jsxs("p",{className:"text-lg font-semibold text-gray-900",children:[l.weight," kg"]})]})]})]}),(p.length>0||t.clinicalNotes)&&e.jsxs("div",{className:"bg-white rounded-xl shadow-sm border border-gray-100 p-6",children:[e.jsxs("div",{className:"flex items-center gap-2 text-purple-600 mb-4",children:[e.jsx(K,{}),e.jsx("h2",{className:"text-lg font-semibold",children:"Diagnosis & Notes"})]}),p.length>0&&e.jsxs("div",{className:"mb-4",children:[e.jsx("p",{className:"text-sm text-gray-500 mb-2",children:"Diagnosis"}),e.jsx("div",{className:"flex flex-wrap gap-2",children:p.map((s,a)=>e.jsx("span",{className:"px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm",children:s},a))})]}),t.clinicalNotes&&e.jsxs("div",{children:[e.jsx("p",{className:"text-sm text-gray-500 mb-2",children:"Clinical Notes"}),e.jsx("p",{className:"text-gray-700 whitespace-pre-wrap",children:t.clinicalNotes})]})]}),t.medicines&&t.medicines.length>0&&e.jsxs("div",{className:"bg-white rounded-xl shadow-sm border border-gray-100 p-6",children:[e.jsxs("div",{className:"flex items-center gap-2 text-green-600 mb-4",children:[e.jsx(Y,{}),e.jsx("h2",{className:"text-lg font-semibold",children:"Medicines"})]}),e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"border-b border-gray-100",children:[e.jsx("th",{className:"text-left py-3 px-4 text-sm font-semibold text-gray-600",children:"#"}),e.jsx("th",{className:"text-left py-3 px-4 text-sm font-semibold text-gray-600",children:"Medicine"}),e.jsx("th",{className:"text-left py-3 px-4 text-sm font-semibold text-gray-600",children:"Dosage"}),e.jsx("th",{className:"text-left py-3 px-4 text-sm font-semibold text-gray-600",children:"Frequency"}),e.jsx("th",{className:"text-left py-3 px-4 text-sm font-semibold text-gray-600",children:"Duration"}),e.jsx("th",{className:"text-left py-3 px-4 text-sm font-semibold text-gray-600",children:"Timing"})]})}),e.jsx("tbody",{children:t.medicines.map((s,a)=>e.jsxs("tr",{className:"border-b border-gray-50",children:[e.jsx("td",{className:"py-3 px-4 text-gray-500",children:a+1}),e.jsxs("td",{className:"py-3 px-4",children:[e.jsx("p",{className:"font-medium text-gray-900",children:s.medicineName}),s.genericName&&e.jsx("p",{className:"text-sm text-gray-500",children:s.genericName})]}),e.jsx("td",{className:"py-3 px-4 text-gray-700",children:s.dosage||"-"}),e.jsx("td",{className:"py-3 px-4 text-gray-700",children:s.frequency||"-"}),e.jsx("td",{className:"py-3 px-4 text-gray-700",children:s.duration||"-"}),e.jsx("td",{className:"py-3 px-4 text-gray-700",children:s.timing||"-"})]},s.id))})]})})]}),t.labTests&&t.labTests.length>0&&e.jsxs("div",{className:"bg-white rounded-xl shadow-sm border border-gray-100 p-6",children:[e.jsxs("div",{className:"flex items-center gap-2 text-orange-600 mb-4",children:[e.jsx(Z,{}),e.jsx("h2",{className:"text-lg font-semibold",children:"Lab Tests"})]}),e.jsx("div",{className:"space-y-3",children:t.labTests.map((s,a)=>{var i;return e.jsxs("div",{className:"flex items-center gap-3 p-3 bg-gray-50 rounded-lg",children:[e.jsx("span",{className:"w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-medium",children:a+1}),e.jsxs("div",{children:[e.jsx("p",{className:"font-medium text-gray-900",children:s.testName}),s.instructions&&e.jsx("p",{className:"text-sm text-gray-500",children:s.instructions}),((i=s.lab)==null?void 0:i.name)&&e.jsxs("p",{className:"text-sm text-blue-600",children:["Lab: ",s.lab.name]})]})]},s.id)})})]}),t.advice&&e.jsxs("div",{className:"bg-white rounded-xl shadow-sm border border-gray-100 p-6",children:[e.jsxs("div",{className:"flex items-center gap-2 text-blue-600 mb-4",children:[e.jsx(J,{}),e.jsx("h2",{className:"text-lg font-semibold",children:"Advice"})]}),e.jsx("p",{className:"text-gray-700 whitespace-pre-wrap",children:t.advice})]}),t.followUpDate&&e.jsxs("div",{className:"bg-white rounded-xl shadow-sm border border-gray-100 p-6",children:[e.jsxs("div",{className:"flex items-center gap-2 text-teal-600 mb-4",children:[e.jsx(ee,{}),e.jsx("h2",{className:"text-lg font-semibold",children:"Follow-up"})]}),e.jsxs("p",{className:"text-gray-700",children:["Next visit scheduled for: ",e.jsx("span",{className:"font-medium",children:c(t.followUpDate)})]})]})]}),e.jsx(se,{isOpen:$,onClose:()=>n(!1),title:"Send Prescription",size:"sm",children:e.jsxs("div",{className:"space-y-4",children:[e.jsx("p",{className:"text-gray-600",children:"How would you like to send this prescription to the patient?"}),e.jsxs("div",{className:"space-y-3",children:[e.jsxs("button",{onClick:()=>g("whatsapp"),className:"w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors",children:[e.jsx("div",{className:"w-10 h-10 bg-green-100 rounded-full flex items-center justify-center",children:e.jsx(te,{className:"text-green-600 text-lg"})}),e.jsxs("div",{className:"text-left",children:[e.jsx("p",{className:"font-medium text-gray-900",children:"WhatsApp"}),e.jsxs("p",{className:"text-sm text-gray-500",children:["Send via WhatsApp to ",((f=t.patient)==null?void 0:f.phone)||"patient"]})]})]}),e.jsxs("button",{onClick:()=>g("email"),className:"w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors",children:[e.jsx("div",{className:"w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center",children:e.jsx(ae,{className:"text-blue-600 text-lg"})}),e.jsxs("div",{className:"text-left",children:[e.jsx("p",{className:"font-medium text-gray-900",children:"Email"}),e.jsxs("p",{className:"text-sm text-gray-500",children:["Send via email to ",((u=t.patient)==null?void 0:u.email)||"patient"]})]})]})]})]})})]})})}export{re as default};
