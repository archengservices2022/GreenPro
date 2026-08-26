import admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

for (const envFile of ['./.env', './.env.local']) {
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
}

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
  : process.env.GOOGLE_APPLICATION_CREDENTIALS && existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    ? JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'))
    : null;

if (!serviceAccount) {
  throw new Error('Firebase credentials are not configured. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON.');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const app = express();
const allowedOrigins = new Set(
  String(process.env.ALLOWED_ORIGINS || 'http://localhost:8080,http://127.0.0.1:8080')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
);
app.use((req, res, next) => cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    try {
      if (new URL(origin).host === req.get('host')) return callback(null, true);
    } catch (_) {
      // Invalid origins are rejected below.
    }
    return callback(new Error('Origin is not allowed by CORS.'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
})(req, res, next));
app.use(express.json({ limit: '2mb' }));
app.disable('x-powered-by');

const db = admin.firestore();
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_RULE_TEXT = 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.';

const normalizeEmail = value => String(value || '').trim().toLowerCase();
const currency = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.round(Number(value || 0) * 100) / 100);

function drawCompanyLogo(document, company, x, y, width = 34, height = 34) {
  const source = String(company?.companyLogoDataUrl || '').trim();
  const encoded = source.match(/^data:image\/(?:png|jpe?g|webp);base64,(.+)$/i)?.[1];
  if (!encoded) return false;
  try {
    document.image(Buffer.from(encoded, 'base64'), x, y, { fit: [width, height], align: 'center', valign: 'center' });
    return true;
  } catch (_) {
    return false;
  }
}

function smtpTransport(){
  const host=String(process.env.SMTP_HOST || '').trim();
  const user=String(process.env.SMTP_USER || '').trim();
  const pass=String(process.env.SMTP_PASS || '').trim();
  if(!host || !user || !pass) return null;
  const port=Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({host,port,secure:String(process.env.SMTP_SECURE || '').toLowerCase()==='true' || port===465,auth:{user,pass}});
}

function escapeCalendarText(value=''){
  return String(value).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
}
function calendarDateTime(dateValue,timeValue=''){
  const date=String(dateValue || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!date) return '';
  const time=String(timeValue || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  let hour=Number(time?.[1] || 9);
  const minute=Number(time?.[2] || 0);
  const period=String(time?.[3] || '').toUpperCase();
  if(period==='PM' && hour<12) hour+=12;
  if(period==='AM' && hour===12) hour=0;
  return `${date[1]}${date[2]}${date[3]}T${String(hour).padStart(2,'0')}${String(minute).padStart(2,'0')}00`;
}
function crewScheduleCalendarInvite(job,companyName){
  const start=calendarDateTime(job?.date,job?.time);
  if(!start) return '';
  const endDate=new Date(`${String(job.date)}T00:00:00`);
  endDate.setHours(endDate.getHours()+2);
  const end=`${endDate.getFullYear()}${String(endDate.getMonth()+1).padStart(2,'0')}${String(endDate.getDate()).padStart(2,'0')}T${String(endDate.getHours()).padStart(2,'0')}${String(endDate.getMinutes()).padStart(2,'0')}00`;
  const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
  const jobNo=`JOB-${String(job?.id || '').replace(/^JOB-/i,'')}`;
  const description=`${jobNo} · ${job?.service || 'Service visit'} for ${job?.customer || 'Customer'}${job?.notes ? `\\nNotes: ${job.notes}` : ''}`;
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//GreenOps//Crew Schedule//EN','CALSCALE:GREGORIAN','METHOD:REQUEST','BEGIN:VEVENT',`UID:${escapeCalendarText(jobNo)}-${Date.now()}@greenops`,`DTSTAMP:${stamp}`,`DTSTART:${start}`,`DTEND:${end}`,`SUMMARY:${escapeCalendarText(`${jobNo} · ${job?.service || 'Scheduled job'}`)}`,`DESCRIPTION:${escapeCalendarText(description)}`,`LOCATION:${escapeCalendarText(job?.address || '')}`,`ORGANIZER;CN=${escapeCalendarText(companyName)}:mailto:`, 'END:VEVENT','END:VCALENDAR'].join('\r\n');
}
async function sendCrewScheduleSms(phone,message){
  const accountSid=String(process.env.TWILIO_ACCOUNT_SID || '').trim();
  const authToken=String(process.env.TWILIO_AUTH_TOKEN || '').trim();
  const from=String(process.env.TWILIO_FROM || '').trim();
  const to=String(phone || '').replace(/[\s()-]/g,'');
  if(!accountSid || !authToken || !from || !/^\+\d{7,15}$/.test(to)) return false;
  const body=new URLSearchParams({To:to,From:from,Body:message});
  const response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,{
    method:'POST',
    headers:{Authorization:`Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},
    body
  });
  if(!response.ok) throw new Error('SMS delivery failed. Check the Twilio settings and crew phone number.');
  return true;
}
async function sendCrewScheduleCall(phone,message){
  const accountSid=String(process.env.TWILIO_ACCOUNT_SID || '').trim();
  const authToken=String(process.env.TWILIO_AUTH_TOKEN || '').trim();
  const from=String(process.env.TWILIO_VOICE_FROM || process.env.TWILIO_FROM || '').trim();
  const to=String(phone || '').replace(/[\s()-]/g,'');
  if(!accountSid || !authToken || !from || !/^\+\d{7,15}$/.test(to)) return false;
  const safeMessage=String(message || 'You have a scheduled GreenOps job.').replace(/[<&>]/g,' ');
  const body=new URLSearchParams({To:to,From:from,Twiml:`<Response><Say voice="alice">${safeMessage}</Say></Response>`});
  const response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,{
    method:'POST',
    headers:{Authorization:`Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},
    body
  });
  if(!response.ok) throw new Error('Call delivery failed. Check the Twilio Voice settings and crew phone number.');
  return true;
}

function createInvoicePdf(invoice, company){
  return new Promise((resolve,reject)=>{
    // All content is positioned on a fixed A4 canvas. Zero margins prevent
    // PDFKit from creating a spill-over page for the bottom footer.
    const document=new PDFDocument({size:'A4',margins:{top:0,right:0,bottom:0,left:0}});
    const chunks=[];
    document.on('data',chunk=>chunks.push(chunk));
    document.on('end',()=>resolve(Buffer.concat(chunks)));
    document.on('error',reject);
    // Match the slate-blue colour system used by the compact estimate PDF.
    const blue='#334155';
    const navy='#111827';
    const muted='#64748b';
    const line='#d9e0e8';
    const soft='#f6f7f9';
    const gold='#cbd5e1';
    const pageWidth=595;
    const right=549;
    if(Number(invoice.total || 0)>0 && Number(invoice.due || 0)<=0){
      document.save().opacity(.06).fillColor(blue).font('Helvetica-Bold').fontSize(94)
        .rotate(-28,{origin:[300,410]}).text('PAID',115,350,{width:370,align:'center'}).restore();
    }
    // Branded header with the uploaded logo and complete company contact details.
    // Four short rows prevent long email or website values from wrapping over
    // the invoice metadata below.
    document.roundedRect(48,48,501,72,10).fill(soft);
    const invoiceHasLogo=drawCompanyLogo(document,company,60,60,32,32);
    if(!invoiceHasLogo){ document.roundedRect(60,62,27,27,7).fill(blue); document.fillColor('#fff').font('Helvetica-Bold').fontSize(16).text('G',68,67,{width:12,align:'center'}); }
    const companyName=String(company.name || 'GreenOps').replace(/[\r\n]+/g,' ').trim();
    const companyTitleSize=companyName.length>38?13:companyName.length>29?15:17;
    const companyX=invoiceHasLogo?102:98;
    document.fillColor(navy).font('Helvetica-Bold').fontSize(companyTitleSize).text(companyName,companyX,60,{width:298,height:20,ellipsis:true});
    document.fillColor(muted).font('Helvetica').fontSize(7.5)
      .text(String(company.address || 'Professional service and support'),companyX,82,{width:298,ellipsis:true})
      .text([String(company.phone || '').trim(),String(company.email || '').trim()].filter(Boolean).join('  |  '),companyX,94,{width:298,ellipsis:true})
      .text(String(company.website || ''),companyX,106,{width:298,ellipsis:true});
    document.rect(48,117,501,3).fill(gold);

    // Invoice banner and metadata
    document.roundedRect(420,59,117,28,8).fill(blue);
    document.fillColor('#fff').font('Helvetica-Bold').fontSize(12).text('INVOICE',420,67,{width:117,align:'center'});
    const meta=[['INVOICE NO.',invoice.id],['DATE',invoice.invoiceDate],['DUE DATE',invoice.dueDate]];
    meta.forEach(([label,value],index)=>{
      const y=128+(index*20);
      document.fillColor(muted).font('Helvetica-Bold').fontSize(7).text(label,410,y,{width:72,align:'right'});
      document.fillColor(navy).font('Helvetica').fontSize(8).text(String(value || '-'),491,y,{width:58,align:'right'});
    });

    // Billing information
    document.fillColor(navy).font('Helvetica-Bold').fontSize(8).text('BILL TO',48,185);
    document.fillColor(navy).font('Helvetica-Bold').fontSize(10).text(String(invoice.customer || ''),48,200,{width:210,ellipsis:true});
    document.fillColor(muted).font('Helvetica').fontSize(8).text(String(invoice.customerAddress || ''),48,216,{width:210,ellipsis:true}).text(String(invoice.customerEmail || ''),48,228,{width:210,ellipsis:true});
    document.fillColor(navy).font('Helvetica-Bold').fontSize(8).text('SERVICE DETAILS',292,185);
    document.fillColor(navy).font('Helvetica').fontSize(9).text(String(invoice.projectName || invoice.service || 'Service invoice'),292,200,{width:220,ellipsis:true});
    document.fillColor(muted).font('Helvetica').fontSize(8).text(String(company.phone || ''),292,217,{width:220,ellipsis:true}).text(String(company.email || ''),292,229,{width:220,ellipsis:true});

    // Line items
    const tableX=48;
    const tableY=260;
    const tableWidth=501;
    const columns={job:tableX+10,description:tableX+104,qty:tableX+300,rate:tableX+350,total:tableX+430};
    document.rect(tableX,tableY,tableWidth,24).fill(blue);
    document.fillColor('#fff').font('Helvetica-Bold').fontSize(7.5).text('JOB NO.',columns.job,268,{width:88}).text('SERVICE NAME',columns.description,268,{width:185}).text('QTY',columns.qty,268,{width:42,align:'right'}).text('RATE',columns.rate,268,{width:66,align:'right'}).text('TOTAL',columns.total,268,{width:71,align:'right'});
    const lineItems=Array.isArray(invoice.lineItems) ? invoice.lineItems.slice(0,6) : [];
    const displayedItems=lineItems.length ? lineItems : [{jobId:invoice.jobId || '',description:'Service',quantity:1,rate:Number(invoice.total || 0)}];
    displayedItems.forEach((item,index)=>{
      const y=284+(index*25);
      document.rect(tableX,y,tableWidth,25).fill(index%2 ? '#ffffff' : '#f6f7f9');
      const linkedJobId=item.jobId || (index===0 ? invoice.jobId : '');
      const jobNumber=linkedJobId ? `JOB-${String(linkedJobId).replace(/^JOB-/i,'')}` : '-';
      document.fillColor(navy).font('Helvetica').fontSize(8).text(jobNumber,columns.job,y+8,{width:88,ellipsis:true}).text(String(item.description || ''),columns.description,y+8,{width:185,ellipsis:true}).text(String(Number(item.quantity || 0)),columns.qty,y+8,{width:42,align:'right'}).text(currency(item.rate),columns.rate,y+8,{width:66,align:'right'}).text(currency(Number(item.quantity || 0)*Number(item.rate || 0)),columns.total,y+8,{width:71,align:'right'});
    });
    const itemEnd=284+(displayedItems.length*25);
    const totalsY=Math.max(335,itemEnd+18);
    document.fillColor(muted).font('Helvetica-Bold').fontSize(7.5).text('REMARKS / PAYMENT INSTRUCTIONS',48,totalsY);
    const noteText=String(invoice.notes || `Please pay by ${invoice.dueDate || 'the due date'}. Thank you.`).replace(/[\r\n]+/g,' ').slice(0,300);
    document.fillColor(muted).font('Helvetica').fontSize(8).text(noteText,48,totalsY+14,{width:245,height:44,ellipsis:true});
    const totalRows=[['SUBTOTAL',invoice.subtotal],['DISCOUNT',invoice.discount],['TAX',invoice.tax],['TOTAL',invoice.total],['PAID',invoice.paid]];
    totalRows.forEach(([label,value],index)=>{
      const y=totalsY+(index*18);
      document.fillColor(index===3?navy:muted).font(index===3?'Helvetica-Bold':'Helvetica').fontSize(8).text(label,366,y,{width:93,align:'right'});
      document.moveTo(468,y+10).lineTo(549,y+10).lineWidth(.5).strokeColor(line).stroke();
      document.fillColor(navy).font(index===3?'Helvetica-Bold':'Helvetica').fontSize(8).text(currency(value),470,y,{width:79,align:'right'});
    });
    const balanceY=totalsY+95;
    document.moveTo(357,balanceY-7).lineTo(right,balanceY-7).lineWidth(.8).strokeColor(line).stroke();
    document.fillColor(navy).font('Helvetica-Bold').fontSize(10).text('BALANCE DUE',366,balanceY,{width:95,align:'right'});
    document.roundedRect(466,balanceY-7,83,27,6).fill(Number(invoice.due || 0)>0 ? '#eef2f7' : '#e6edf5');
    document.fillColor(navy).font('Helvetica-Bold').fontSize(11).text(currency(invoice.due),470,balanceY+1,{width:75,align:'right'});
    // Footer strip
    document.rect(0,756,pageWidth,86).fill(navy);
    document.rect(0,756,pageWidth,4).fill(gold);
    document.fillColor('#fff').font('Helvetica-Bold').fontSize(10).text(companyName,48,775,{width:499,align:'center',height:14,ellipsis:true});
    document.fillColor('#dcefe5').font('Helvetica').fontSize(7.5).text(String(company.address || ''),48,793,{width:499,align:'center',height:12,ellipsis:true});
    document.end();
  });
}

function createEstimatePdf(estimate, company){
  return new Promise((resolve,reject)=>{
    // Keep the fixed layout on one A4 page, including the bottom footer.
    const document=new PDFDocument({size:'A4',margins:{top:0,right:0,bottom:0,left:0}});
    const chunks=[];
    document.on('data',chunk=>chunks.push(chunk));
    document.on('end',()=>resolve(Buffer.concat(chunks)));
    document.on('error',reject);
    // Slate-blue palette derived from the supplied compact estimate sample.
    // Keep this document independent from the green invoice/job templates.
    const green='#334155', dark='#111827', muted='#64748b', line='#d9e0e8', soft='#f6f7f9', gold='#cbd5e1';
    const compact=(value,max=140)=>String(value || '').replace(/[\r\n]+/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
    const companyName=compact(company?.name || 'GreenOps',120);
    const companyFontSize=companyName.length>38?13:companyName.length>29?15:17;
    const estimateAmount=Number(estimate.amount || 0);
    const status=String(estimate.status || 'pending').toLowerCase();
    const isApproved=['paid','approved','converted'].includes(status);
    const approvedAmount=isApproved ? Number(estimate.approvedAmount ?? estimateAmount) : 0;

    // Branded header: the legal company name and uploaded logo remain visible
    // on every customer-facing estimate.
    document.roundedRect(48,48,499,72,10).fill(soft);
    const hasLogo=drawCompanyLogo(document,company,60,60,32,32);
    if(!hasLogo){
      document.roundedRect(60,60,28,28,7).fill(green);
      document.fillColor('#fff').font('Helvetica-Bold').fontSize(15).text('G',68,65,{width:12,align:'center'});
    }
    const companyX=hasLogo?104:100;
    document.fillColor(dark).font('Helvetica-Bold').fontSize(companyFontSize)
      .text(companyName,companyX,60,{width:292,height:22,ellipsis:true});
    document.fillColor(muted).font('Helvetica').fontSize(7.5)
      .text(compact(company?.address || '',75),companyX,82,{width:285,ellipsis:true})
      .text([compact(company?.phone || '',28),compact(company?.email || '',42),compact(company?.website || '',35)].filter(Boolean).join('  |  '),companyX,94,{width:285,ellipsis:true});
    document.roundedRect(420,61,117,28,8).fill(green);
    document.fillColor('#fff').font('Helvetica-Bold').fontSize(11).text('ESTIMATE',420,70,{width:117,align:'center'});
    document.rect(48,117,499,3).fill(gold);

    // Document title and reference information.
    document.fillColor(dark).font('Helvetica-Bold').fontSize(25).text('ESTIMATE',48,139);
    const metadata=[['ESTIMATE NO.',compact(estimate.id || '-',32)],['ESTIMATE DATE',compact(estimate.createdDate || estimate.estimateDate || '-',32)],['VALID UNTIL',compact(estimate.validUntil || estimate.expirationDate || '-',32)]];
    metadata.forEach(([label,value],index)=>{
      const y=135+(index*19);
      document.fillColor(muted).font('Helvetica-Bold').fontSize(7).text(label,390,y,{width:86,align:'right'});
      document.fillColor(dark).font('Helvetica-Bold').fontSize(8.5).text(value,483,y,{width:64,align:'right',ellipsis:true});
    });

    // Customer information only. Approval values are deliberately omitted
    // until the estimate has actually been approved.
    document.roundedRect(48,206,499,79,9).fill('#fbfdfc').strokeColor(line).lineWidth(.7).stroke();
    document.fillColor(green).font('Helvetica-Bold').fontSize(8).text('PREPARED FOR',62,221);
    document.fillColor(dark).font('Helvetica-Bold').fontSize(13).text(compact(estimate.customer || 'Customer',60),62,237,{width:455,ellipsis:true});
    document.fillColor(muted).font('Helvetica').fontSize(8.5)
      .text(compact(estimate.customerAddress || '',100),62,258,{width:455,ellipsis:true})
      .text(compact(estimate.customerEmail || '',100),62,270,{width:455,ellipsis:true});

    // Show the approved amount only after the customer has approved.
    const tableX=48, tableY=315, tableWidth=499;
    document.roundedRect(tableX,tableY,tableWidth,26,7).fill(green);
    document.fillColor('#fff').font('Helvetica-Bold').fontSize(8.5).text('SERVICE',tableX+14,324,{width:isApproved?232:280})
      .text('ESTIMATED AMOUNT',tableX+(isApproved?252:300),324,{width:isApproved?128:185,align:'right'});
    if(isApproved) document.text('APPROVED AMOUNT',tableX+382,324,{width:104,align:'right'});
    document.rect(tableX,341,tableWidth,44).fill('#f4faf6');
    document.fillColor(dark).font('Helvetica-Bold').fontSize(10).text(compact(estimate.service || 'Service',80),tableX+14,357,{width:isApproved?224:280,ellipsis:true});
    document.fillColor(dark).font('Helvetica-Bold').fontSize(10).text(currency(estimateAmount),tableX+(isApproved?252:300),357,{width:isApproved?128:185,align:'right'});
    if(isApproved) document.fillColor(green).font('Helvetica-Bold').fontSize(10).text(currency(approvedAmount),tableX+382,357,{width:104,align:'right'});

    // Amount summary followed by a full-width Note section.
    const summaryY=415;
    const summaryRows=[['ESTIMATED AMOUNT',currency(estimateAmount),dark],...(isApproved?[['APPROVED AMOUNT',currency(approvedAmount),green]]:[])];
    const summaryHeight=isApproved?84:55;
    document.roundedRect(48,summaryY,499,summaryHeight,9).fill('#fbfdfc').strokeColor(line).lineWidth(.7).stroke();
    summaryRows.forEach(([label,value,color],index)=>{
      const y=summaryY+16+(index*29);
      document.fillColor(muted).font('Helvetica-Bold').fontSize(7.5).text(label,64,y,{width:180});
      document.fillColor(color).font('Helvetica-Bold').fontSize(index===1?13:10).text(value,387,y-2,{width:144,align:'right',ellipsis:true});
      if(index<summaryRows.length-1) document.moveTo(64,y+21).lineTo(531,y+21).lineWidth(.5).strokeColor(line).stroke();
    });
    const notesY=summaryY+summaryHeight+20;
    document.roundedRect(48,notesY,499,84,9).fill('#fbfdfc').strokeColor(line).lineWidth(.7).stroke();
    document.fillColor(dark).font('Helvetica-Bold').fontSize(11).text('Note',64,notesY+16);
    document.fillColor(muted).font('Helvetica').fontSize(9).text(compact(estimate.notes || 'Thank you for the opportunity to provide this estimate. Please contact us with any questions.',390),64,notesY+38,{width:467,height:29,ellipsis:true});

    // Minimal footer: name and address only, anchored to the page bottom.
    document.moveTo(48,770).lineTo(547,770).lineWidth(.8).strokeColor(line).stroke();
    document.fillColor(green).font('Helvetica-Bold').fontSize(9).text(companyName,48,785,{width:499,align:'center',height:13,ellipsis:true});
    document.fillColor(muted).font('Helvetica').fontSize(7.5).text(compact(company?.address || '',85),48,801,{width:499,align:'center',height:11,ellipsis:true});
    document.end();
  });
}

function createJobPdf(job, company){
  return new Promise((resolve,reject)=>{
    const document=new PDFDocument({size:'A4',margins:{top:0,right:0,bottom:0,left:0},bufferPages:true});
    const chunks=[];
    document.on('data',chunk=>chunks.push(chunk));
    document.on('end',()=>resolve(Buffer.concat(chunks)));
    document.on('error',reject);
    // Use the same slate-blue palette as invoices and estimates.
    const green='#334155', dark='#111827', muted='#64748b', line='#d9e0e8', soft='#f6f7f9', gold='#cbd5e1';
    const compact=(value,max=120)=>String(value || '').replace(/[\r\n]+/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
    const companyName=compact(company.name || 'GreenOps',120);
    const companyTitleSize=companyName.length>38 ? 13 : companyName.length>29 ? 15 : 17;
    const jobNumber=`JOB-${compact(job.id,30).replace(/^#?JOB-/i,'')}`;
    const customerName=compact(job.customerName || job.customer || 'Customer',70);
    const customerAddress=compact(job.customerAddress || job.address || '',110);
    const scheduledDate=compact(job.date,28) || 'To be confirmed';
    const drawDetail=(label,value,x,y,width)=>{
      document.fillColor(muted).font('Helvetica-Bold').fontSize(7.5).text(label.toUpperCase(),x,y,{width});
      document.fillColor(dark).font('Helvetica-Bold').fontSize(10).text(compact(value || 'Not provided',70),x,y+13,{width,height:14,ellipsis:true});
    };

    // Branded header with complete company contact details.
    document.roundedRect(48,48,499,80,10).fill(soft);
    const hasLogo=drawCompanyLogo(document,company,60,60,32,32);
    const headerX=hasLogo?104:60;
    document.fillColor(dark).font('Helvetica-Bold').fontSize(companyTitleSize)
      .text(companyName,headerX,60,{width:294,height:28,ellipsis:false,lineBreak:true});
    document.fillColor(muted).font('Helvetica').fontSize(7.2)
      .text(compact(company.address,76),headerX,82,{width:285,height:9,ellipsis:true})
      .text([compact(company.phone,28),compact(company.email,42)].filter(Boolean).join('  |  '),headerX,94,{width:285,height:9,ellipsis:true})
      .text(compact(company.website,40),headerX,106,{width:285,height:9,ellipsis:true});
    document.rect(48,125,499,3).fill(gold);
    document.roundedRect(420,64,117,28,8).fill(green);
    document.fillColor('#fff').font('Helvetica-Bold').fontSize(11).text('NEW JOB',420,73,{width:117,align:'center'});

    // Title and reference details
    document.fillColor(dark).font('Helvetica-Bold').fontSize(25).text('NEW JOB',48,151,{width:300});
    document.fillColor(muted).font('Helvetica-Bold').fontSize(7).text('JOB NO.',410,156,{width:66,align:'right'});
    document.fillColor(dark).font('Helvetica-Bold').fontSize(9).text(jobNumber,484,155,{width:63,align:'right',ellipsis:true});

    // Customer and appointment cards
    document.roundedRect(48,206,239,86,9).fill(soft).strokeColor(line).lineWidth(.7).stroke();
    document.roundedRect(308,206,239,86,9).fill(soft).strokeColor(line).lineWidth(.7).stroke();
    document.fillColor(green).font('Helvetica-Bold').fontSize(8).text('SERVICE FOR',62,221);
    document.fillColor(dark).font('Helvetica-Bold').fontSize(14).text(customerName,62,237,{width:204,height:18,ellipsis:true});
    document.fillColor(muted).font('Helvetica').fontSize(8.5).text(customerAddress || 'Property details not provided.',62,259,{width:204,height:15,ellipsis:true});
    document.fillColor(green).font('Helvetica-Bold').fontSize(8).text('SCHEDULED FOR',322,221);
    document.fillColor(dark).font('Helvetica-Bold').fontSize(12).text(scheduledDate,322,237,{width:210,height:17,ellipsis:true});

    // Job details
    document.fillColor(dark).font('Helvetica-Bold').fontSize(12).text('Job details',48,320);
    document.moveTo(48,340).lineTo(547,340).lineWidth(.8).strokeColor(line).stroke();
    drawDetail('Service',job.service,48,357,150);
    drawDetail('Duration',job.duration ? `${job.duration} hour${Number(job.duration)===1?'':'s'}` : '',215,357,100);
    drawDetail('Priority',job.priority,335,357,212);
    document.moveTo(48,399).lineTo(547,399).lineWidth(.8).strokeColor(line).stroke();
    drawDetail('Job date',job.date,48,416,150);
    drawDetail('Equipment',job.equipment,215,416,332);

    // Notes panel
    document.roundedRect(48,485,499,110,9).fill('#fbfdfc').strokeColor(line).lineWidth(.7).stroke();
    document.fillColor(dark).font('Helvetica-Bold').fontSize(11).text('Notes',64,502);
    document.fillColor(muted).font('Helvetica').fontSize(9).text(compact(job.notes || 'No additional instructions were provided for this service visit.',360),64,524,{width:467,height:48,ellipsis:true});

    // Footer
    document.rect(0,756,595,86).fill(dark);
    document.rect(0,756,595,4).fill(gold);
    document.fillColor('#fff').font('Helvetica-Bold').fontSize(10).text(companyName,48,775,{width:499,align:'center',ellipsis:true});
    document.fillColor('#dcefe5').font('Helvetica').fontSize(7.5).text(compact(company.address,85),48,793,{width:499,align:'center',ellipsis:true});
    document.end();
  });
}

function configuredAdminSender(req, profile, companyName, companyEmail=''){
  const fromAddress=normalizeEmail(process.env.SMTP_FROM || process.env.SMTP_USER);
  if(!fromAddress) throw Object.assign(new Error('SMTP sender address is not configured.'),{code:'EMAIL_NOT_CONFIGURED'});
  // Customer-facing documents must never fall back to an individual admin
  // address. The saved Company Email is the sole permitted sender identity.
  const selectedCompanyEmail=normalizeEmail(companyEmail);
  if(!selectedCompanyEmail){
    throw Object.assign(new Error('Add a Company Email in Company Settings before sending email.'),{code:'COMPANY_EMAIL_REQUIRED'});
  }
  if(selectedCompanyEmail!==fromAddress){
    throw Object.assign(new Error(`Company Email must match the configured SMTP sender (${fromAddress}).`),{code:'SMTP_SENDER_MISMATCH'});
  }
  return {from:`${String(companyName || 'GreenOps').replace(/[<>\r\n]/g,'')} <${fromAddress}>`,replyTo:fromAddress,email:fromAddress};
}

function cleanWorkspaceData(data = {}) {
  return {
    customers: Array.isArray(data.customers) ? data.customers : [],
    services: Array.isArray(data.services) ? data.services : [],
    jobs: Array.isArray(data.jobs) ? data.jobs : [],
    estimates: Array.isArray(data.estimates) ? data.estimates : [],
    invoices: Array.isArray(data.invoices) ? data.invoices : [],
    crew: Array.isArray(data.crew) ? data.crew : [],
    teamAccounts: Array.isArray(data.teamAccounts)
      ? data.teamAccounts.map(({ password, ...account }) => account)
      : [],
    // Customer delivery links are kept separate from editable records so a
    // later job edit cannot remove a customer's portal access.
    customerShares: Array.isArray(data.customerShares) ? data.customerShares : [],
    notifications: Array.isArray(data.notifications) ? data.notifications.slice(0, 40) : [],
    settings: data.settings && typeof data.settings === 'object' ? data.settings : {}
  };
}

function workspaceRecordCount(data = {}) {
  return ['customers', 'services', 'jobs', 'estimates', 'invoices', 'crew', 'teamAccounts']
    .reduce((total, key) => total + (Array.isArray(data[key]) ? data[key].length : 0), 0);
}

function customerPortalWorkspace(data = {}, profile = {}) {
  const workspace = cleanWorkspaceData(data);
  const customer = findCustomerForProfile(workspace.customers, profile);
  if (!customer) {
    return cleanWorkspaceData({ settings: { companyName: workspace.settings?.companyName || '' } });
  }
  const customerId = String(customer.id || '');
  const customerName = normalizeEmail(customer.name);
  const profileCustomerId = String(profile.customerId || '').trim();
  const profileEmail = normalizeEmail(profile.email);
  const profileName = normalizeEmail(profile.customerName || profile.name);
  const customerAliases = new Set([
    customerId,
    normalizeEmail(customer.email),
    customerName,
    profileCustomerId,
    profileEmail,
    profileName
  ].filter(Boolean));
  const isSharedCustomerRecord = record => {
    if (!Boolean(record?.sentAt || record?.sentToCustomerAt)) return false;
    return customerAliases.has(String(record.sharedCustomerId || ''))
      || customerAliases.has(String(record.customerId || ''))
      || customerAliases.has(normalizeEmail(record.sharedCustomerEmail || record.customerEmail))
      || customerAliases.has(normalizeEmail(record.customer));
  };
  const notificationTargets = customerAliases;
  const notifications = workspace.notifications.filter(item => {
    const audience = String(item?.audience || '');
    return audience.startsWith('customer:') && notificationTargets.has(audience.slice('customer:'.length));
  });
  const customerShareKeys = new Set((workspace.customerShares || []).filter(link => {
    const linkCustomerId = String(link?.customerId || '');
    const linkEmail = normalizeEmail(link?.customerEmail);
    const linkName = normalizeEmail(link?.customerName);
    return customerAliases.has(linkCustomerId) || customerAliases.has(linkEmail) || customerAliases.has(linkName);
  }).map(link => `${String(link.kind || '').toLowerCase().replace(/s$/, '')}:${String(link.recordId || '').replace(/^#?JOB-/i, '')}`));
  // A notification is generated in the same server transaction as sharing.
  // It is therefore a reliable ownership link for older jobs with incomplete
  // customer metadata.
  // Older notifications used either `id` or `recordId`, and some job IDs
  // were stored with a JOB-/#JOB- prefix. Normalise all of them so a legacy
  // notification still exposes the matching record in the customer portal.
  const normaliseRecordKind = kind => {
    const value = String(kind || '').trim().toLowerCase().replace(/s$/, '');
    return ['job', 'estimate', 'invoice'].includes(value) ? value : '';
  };
  const sharedRecordKey = (kind, id) => {
    // Notification labels can contain extra text such as
    // "#JOB-1035 · Gardening". Keep only the actual identifier so the
    // notification reliably reveals the matching legacy record.
    const normalisedId = String(id || '').trim().split(/[\s·|]/)[0].replace(/^#?JOB-/i, '');
    return `${normaliseRecordKind(kind)}:${normalisedId}`;
  };
  const notificationRecordId = item => {
    if (item?.recordId || item?.jobId || item?.estimateId || item?.invoiceId) {
      return item.recordId || item.jobId || item.estimateId || item.invoiceId;
    }
    const detail = `${item?.title || ''} ${item?.detail || ''}`;
    const match = detail.match(/(?:#?JOB[-\s]?)?\b(\d{3,})\b/i) || detail.match(/\b(INV-[A-Z0-9-]+|EST-[A-Z0-9-]+)\b/i);
    return match ? match[1] : '';
  };
  const notificationRecordKind = item => {
    const explicitKind = normaliseRecordKind(item?.kind);
    if (explicitKind) return explicitKind;
    const detail = `${item?.title || ''} ${item?.detail || ''}`;
    if (/#?JOB[-\s]?\d+/i.test(detail)) return 'job';
    if (/\bEST-[A-Z0-9-]+\b/i.test(detail)) return 'estimate';
    if (/\bINV-[A-Z0-9-]+\b/i.test(detail)) return 'invoice';
    return '';
  };
  const notifiedRecordIds = new Set(notifications.map(item =>
    sharedRecordKey(notificationRecordKind(item), notificationRecordId(item))
  ).filter(key => !key.startsWith(':') && !key.endsWith(':')));
  // Some older job-share notifications have the correct customer audience but
  // a non-standard `kind` or identifier field. The notification text is still
  // specific to that job, so use it as a final recovery link rather than
  // leaving the customer with a notification and an empty Jobs table.
  const notificationNamesRecord = (kind, record) => {
    const recordId = String(record?.id || '').trim();
    if (!recordId) return false;
    const jobId = String(recordId).replace(/^#?JOB-/i, '');
    const identifiers = kind === 'job'
      ? [recordId, `JOB-${jobId}`, `#JOB-${jobId}`]
      : [recordId];
    return notifications.some(item => {
      const text = `${item?.recordId || ''} ${item?.jobId || ''} ${item?.estimateId || ''} ${item?.invoiceId || ''} ${item?.title || ''} ${item?.detail || ''}`.toLowerCase();
      return identifiers.some(identifier => text.includes(String(identifier).toLowerCase()));
    });
  };
  const recordWasShared = (kind, record) => isSharedCustomerRecord(record)
    || notifiedRecordIds.has(sharedRecordKey(kind, record?.id))
    || customerShareKeys.has(sharedRecordKey(kind, record?.id))
    || notificationNamesRecord(kind, record);
  const jobs = workspace.jobs.filter(job => recordWasShared('job', job));
  const estimates = workspace.estimates.filter(estimate => recordWasShared('estimate', estimate));
  const sharedJobIds = new Set(jobs.map(job => String(job.id || '')).filter(Boolean));
  const isInvoiceLinkedToSharedJob = invoice => {
    const itemJobIds = Array.isArray(invoice?.lineItems)
      ? invoice.lineItems.map(item => String(item?.jobId || '')).filter(Boolean)
      : [];
    return sharedJobIds.has(String(invoice?.jobId || '')) || itemJobIds.some(id => sharedJobIds.has(id));
  };
  const invoices = workspace.invoices.filter(invoice => recordWasShared('invoice', invoice) || (
    Boolean(invoice?.sentAt || invoice?.sentToCustomerAt) && isInvoiceLinkedToSharedJob(invoice)
  ));
  const serviceNames = new Set([...jobs, ...estimates].map(record => String(record.service || '').trim().toLowerCase()).filter(Boolean));
  return cleanWorkspaceData({
    customers: [customer],
    services: workspace.services.filter(service => serviceNames.has(String(service.name || '').trim().toLowerCase())),
    jobs,
    estimates,
    invoices,
    notifications,
    settings: {
      companyName: workspace.settings?.companyName || '',
      email: workspace.settings?.email || '',
      phone: workspace.settings?.phone || '',
      address: workspace.settings?.address || '',
      // Customer and crew portals use the same workspace branding as the
      // administrator portal. Keep the saved logo in the scoped settings.
      companyLogoDataUrl: workspace.settings?.companyLogoDataUrl || ''
    }
  });
}

function findCustomerForProfile(customers = [], profile = {}) {
  const profileCustomerId = String(profile.customerId || '').trim();
  const profileEmail = normalizeEmail(profile.email);
  const profileName = normalizeEmail(profile.customerName || profile.name);
  const entries = Array.isArray(customers) ? customers : [];
  // The login email is the durable link. A user can retain an older customer
  // ID after an administrator recreates or imports that customer's record.
  // Prefer the email match so the current customer record and shared items are
  // opened in the portal.
  return (profileEmail && entries.find(item => normalizeEmail(item.email) === profileEmail))
    || (profileCustomerId && entries.find(item => String(item.id || '') === profileCustomerId))
    || (profileName && entries.find(item => normalizeEmail(item.name) === profileName));
}

function passwordError(password) {
  if (!password || password.length < PASSWORD_MIN_LENGTH) return PASSWORD_RULE_TEXT;
  if (!/[A-Z]/.test(password)) return PASSWORD_RULE_TEXT;
  if (!/[a-z]/.test(password)) return PASSWORD_RULE_TEXT;
  if (!/[0-9]/.test(password)) return PASSWORD_RULE_TEXT;
  if (!/[^A-Za-z0-9]/.test(password)) return PASSWORD_RULE_TEXT;
  return '';
}

async function sendVerificationEmailForUser(authUid) {
  const apiKey = String(process.env.FIREBASE_WEB_API_KEY || '').trim();
  if (!apiKey) throw new Error('FIREBASE_WEB_API_KEY is not configured.');
  const customToken = await admin.auth().createCustomToken(authUid);
  const signInResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true })
  });
  const signInData = await signInResponse.json();
  if (!signInResponse.ok || !signInData.idToken) {
    throw new Error(signInData.error?.message || 'Unable to create verification session.');
  }
  const verificationResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken: signInData.idToken })
  });
  const verificationData = await verificationResponse.json();
  if (!verificationResponse.ok) {
    throw new Error(verificationData.error?.message || 'Unable to send verification email.');
  }
  return true;
}

function publicUser(doc) {
  const data = doc.data ? doc.data() : doc;
  return {
    id: data.id || data.authUid || doc.id,
    firestoreId: doc.id || data.firestoreId || '',
    authUid: data.authUid || data.id || '',
    name: data.name || '',
    email: data.email || '',
    role: data.role || 'admin',
    phone: data.phone || '',
    companyName: data.companyName || '',
    ownerEmail: data.ownerEmail || '',
    employmentStatus: data.employmentStatus || 'Active',
    crewRole: data.crewRole || '',
    availability: data.availability || '',
    address: data.address || '',
    emergencyContact: data.emergencyContact || '',
    skills: data.skills || '',
    profileNotes: data.profileNotes || '',
    customerId: data.customerId || '',
    customerName: data.customerName || ''
  };
}

async function requireAuth(req, res, next) {
  try {
    const header = String(req.headers.authorization || '');
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Authentication required.' });
    // Checking revocation means an account that is made inactive loses access
    // immediately, including any browser session that was already open.
    req.auth = await admin.auth().verifyIdToken(token, true);
    next();
  } catch (_) {
    res.status(401).json({ error: 'Your session is invalid or expired.' });
  }
}

function requireVerifiedAuth(req, res, next) {
  // Workspace users (Crew, Administrator, and Customer) are provisioned by
  // the Admin and are allowed to sign in immediately without email verification.
  next();
}

async function userProfileForAuth(auth) {
  const byUid = await db.collection('users').where('authUid', '==', auth.uid).limit(1).get();
  const snapshot = byUid.empty
    ? await db.collection('users').where('email', '==', normalizeEmail(auth.email)).limit(1).get()
    : byUid;
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  const data = doc.data();
  if (Object.prototype.hasOwnProperty.call(data, 'password')) {
    await doc.ref.update({ password: admin.firestore.FieldValue.delete() });
    delete data.password;
  }
  return publicUser({ firestoreId: doc.id, ...data });
}

function workspaceOwnerFrom(req, profile) {
  if (profile?.role === 'customer' && profile?.ownerEmail) return normalizeEmail(profile.ownerEmail);
  return normalizeEmail(req.auth.ownerEmail || profile?.ownerEmail || req.auth.email);
}

async function repairCustomerWorkspaceLink(profile) {
  if (!profile || profile.role !== 'customer') return profile;
  const profileEmail = normalizeEmail(profile.email);
  if (!profileEmail) return profile;
  const preferredOwner = normalizeEmail(profile.ownerEmail);
  const candidates = [];

  if (preferredOwner) {
    const preferred = await db.collection('workspaces').doc(preferredOwner).get();
    if (preferred.exists) candidates.push(preferred);
  }

  // Older customer logins were sometimes created before their customerId or
  // workspace owner was saved. Find the exact matching customer record once
  // at sign-in, then permanently repair the relationship.
  if (!candidates.length || !findCustomerForProfile(cleanWorkspaceData(candidates[0].data()?.data || candidates[0].data()).customers, profile)) {
    const allWorkspaces = await db.collection('workspaces').get();
    allWorkspaces.docs.forEach(doc => {
      if (!candidates.some(candidate => candidate.id === doc.id)) candidates.push(doc);
    });
  }

  let match = null;
  for (const workspaceDoc of candidates) {
    const workspace = cleanWorkspaceData(workspaceDoc.data()?.data || workspaceDoc.data());
    const customer = findCustomerForProfile(workspace.customers, profile);
    if (customer) {
      match = { ownerEmail: normalizeEmail(workspaceDoc.id), customer };
      break;
    }
  }
  // If this customer login already belongs to a workspace but its matching
  // customer row was deleted or was never created, rebuild that one profile
  // automatically. This prevents a valid customer from landing on a blocked
  // "not linked" screen after signing in.
  if (!match) {
    for (const workspaceDoc of candidates) {
      const workspace = cleanWorkspaceData(workspaceDoc.data()?.data || workspaceDoc.data());
      const workspaceOwner = normalizeEmail(workspaceDoc.id);
      const hasMatchingLogin = workspace.teamAccounts.some(account => normalizeEmail(account?.email) === profileEmail);
      // A local/single-workspace installation may contain customer accounts
      // created before teamAccounts or ownerEmail were stored correctly. With
      // only one workspace available, it is unambiguous and safe to restore
      // that customer's missing profile automatically.
      const isOnlyWorkspace = candidates.length === 1;
      if (workspaceOwner !== preferredOwner && !hasMatchingLogin && !isOnlyWorkspace) continue;
      const fallbackName = String(profile.customerName || profile.name || profile.email?.split('@')[0] || 'Customer').trim();
      const customer = {
        id: Date.now(),
        name: fallbackName,
        email: profileEmail,
        phone: String(profile.phone || ''),
        address: String(profile.address || ''),
        service: '',
        notes: '',
        createdAt: Date.now()
      };
      workspace.customers.push(customer);
      await workspaceDoc.ref.set({
        ownerEmail: workspaceOwner,
        data: workspace,
        updatedBy: workspaceOwner,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      match = { ownerEmail: workspaceOwner, customer };
      break;
    }
  }
  if (!match) return profile;

  const nextProfile = {
    ...profile,
    ownerEmail: match.ownerEmail,
    customerId: String(match.customer.id || profile.customerId || ''),
    customerName: String(match.customer.name || profile.customerName || profile.name || '')
  };
  const needsUpdate = nextProfile.ownerEmail !== normalizeEmail(profile.ownerEmail)
    || nextProfile.customerId !== String(profile.customerId || '')
    || nextProfile.customerName !== String(profile.customerName || '');
  if (needsUpdate && profile.firestoreId) {
    await db.collection('users').doc(profile.firestoreId).set({
      ownerEmail: nextProfile.ownerEmail,
      customerId: nextProfile.customerId,
      customerName: nextProfile.customerName,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    if (profile.authUid) await admin.auth().setCustomUserClaims(profile.authUid, { role: 'customer', ownerEmail: nextProfile.ownerEmail });
  }
  return nextProfile;
}

async function ensureFirebaseAuthUser({ email, password, name, role, ownerEmail, emailVerified=false }) {
  let authUser;
  try {
    authUser = await admin.auth().getUserByEmail(email);
    const updatePayload = {};
    if (password) updatePayload.password = password;
    if (name) updatePayload.displayName = name;
    if (emailVerified) updatePayload.emailVerified = true;
    if (Object.keys(updatePayload).length) {
      authUser = await admin.auth().updateUser(authUser.uid, updatePayload);
    }
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    authUser = await admin.auth().createUser({
      email,
      password,
      displayName: name,
      emailVerified: Boolean(emailVerified),
      disabled: false
    });
  }

  await admin.auth().setCustomUserClaims(authUser.uid, {
    role: role || 'admin',
    ownerEmail: ownerEmail || ''
  });

  return authUser;
}

async function provisionBootstrapAdmin() {
  const email = normalizeEmail(process.env.BOOTSTRAP_ADMIN_EMAIL);
  const password = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || '');
  if (!email || !password) return;

  const validationError = passwordError(password);
  if (validationError) throw new Error(`BOOTSTRAP_ADMIN_PASSWORD: ${validationError}`);

  const name = String(process.env.BOOTSTRAP_ADMIN_NAME || 'Stella Mary').trim();
  const companyName = String(process.env.BOOTSTRAP_ADMIN_COMPANY || 'GreenOps').trim();
  const address = String(process.env.BOOTSTRAP_ADMIN_ADDRESS || 'Not provided').trim();
  const authUser = await ensureFirebaseAuthUser({
    email,
    password,
    name,
    role: 'admin',
    ownerEmail: ''
  });

  await admin.auth().updateUser(authUser.uid, {
    password,
    displayName: name,
    emailVerified: true,
    disabled: false
  });
  await admin.auth().setCustomUserClaims(authUser.uid, { role: 'admin', ownerEmail: '' });

  const existing = await db.collection('users').where('email', '==', email).limit(1).get();
  const profile = {
    authUid: authUser.uid,
    name,
    email,
    role: 'admin',
    ownerEmail: '',
    companyName,
    address,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  if (existing.empty) {
    await db.collection('users').add({
      ...profile,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } else {
    await existing.docs[0].ref.set(profile, { merge: true });
  }

  const workspaceRef = db.collection('workspaces').doc(email);
  const workspace = await workspaceRef.get();
  if (!workspace.exists) {
    await workspaceRef.set({
      ownerEmail: email,
      data: cleanWorkspaceData({
        settings: {
          companyName,
          address,
          phone: '',
          taxRate: '8.25%',
          scheduleStart: '7:00 AM',
          theme: 'light'
        }
      }),
      updatedBy: email,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  console.log(`Bootstrap Admin ready: ${email}`);
}

// Password reset is allowed only for an account that already exists in
// GreenOps. The browser uses this check before requesting Firebase's reset
// email, so an address cannot start a reset flow before it has an account.
app.post('/api/auth/account-exists', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!email) return res.status(400).json({ error: 'Enter the email address for your account.' });
  try {
    await admin.auth().getUserByEmail(email);
    return res.json({ exists: true });
  } catch (error) {
    if (error?.code === 'auth/user-not-found') return res.status(404).json({ exists: false, error: 'No GreenOps account exists for this email. Create an account first.' });
    console.error('Account lookup failed:', error?.message || error);
    return res.status(500).json({ error: 'Unable to check this account right now. Please try again.' });
  }
});

app.post('/api/auth/register-profile', requireAuth, async (req, res) => {
  try {
    const email = normalizeEmail(req.auth.email);
    if (!email) return res.status(400).json({ error: 'An authenticated email is required.' });

    const existing = await db.collection('users').where('email', '==', email).limit(1).get();
    const existingData = existing.empty ? {} : existing.docs[0].data();
    const pendingRef = db.collection('pendingAdminRegistrations').doc(req.auth.uid);
    const pendingSnapshot = await pendingRef.get();
    const pending = pendingSnapshot.exists ? pendingSnapshot.data() : {};
    const name = String(req.body.name || pending.name || existingData.name || '').trim();
    const companyName = String(req.body.companyName || pending.companyName || existingData.companyName || '').trim();
    const address = String(req.body.address || pending.address || existingData.address || '').trim();
    if (!name || !companyName || !address) {
      return res.status(400).json({ error: 'Full name, company name, and company address are required.' });
    }

    if (!req.auth.email_verified) {
      await pendingRef.set({
        authUid: req.auth.uid,
        name,
        email,
        companyName,
        address,
        status: 'pending_email_verification',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: pending.createdAt || admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      return res.status(202).json({
        success: true,
        pendingVerification: true,
        message: 'Verify your email to finish creating the Admin account.'
      });
    }

    const role = 'admin';
    const user = {
      authUid: req.auth.uid,
      name,
      email,
      role,
      ownerEmail: '',
      phone: req.body.phone || '',
      companyName,
      address,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    let docRef;
    if (existing.empty) {
      docRef = await db.collection('users').add({...user, createdAt: admin.firestore.FieldValue.serverTimestamp()});
    } else {
      docRef = existing.docs[0].ref;
      await docRef.set({...user, password: admin.firestore.FieldValue.delete()}, { merge: true });
    }
    await admin.auth().updateUser(req.auth.uid, { displayName: name });
    await admin.auth().setCustomUserClaims(req.auth.uid, { role, ownerEmail: '' });
    await pendingRef.delete();
    res.json({ success: true, user: publicUser({ firestoreId: docRef.id, id: req.auth.uid, ...user }) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    if (!req.auth.email_verified) {
      return res.status(403).json({ error: 'Verify your email before accessing GreenOps.' });
    }
    let user = await userProfileForAuth(req.auth);
    if (!user) return res.status(404).json({ error: 'Account profile not found.' });
    if (['crew', 'customer', 'administrator'].includes(user.role) && user.employmentStatus === 'Inactive') {
      return res.status(403).json({ error: 'This account is inactive. Please contact your administrator.' });
    }
    user = await repairCustomerWorkspaceLink(user);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/team/register', requireAuth, requireVerifiedAuth, async (req, res) => {
  try {
    const profile = await userProfileForAuth(req.auth);
    if (!profile || profile.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' });
    const name = String(req.body.name || '').trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    const role = ['administrator', 'crew', 'customer'].includes(req.body.role) ? req.body.role : 'crew';
    if (!name || !email || password.length < 6) return res.status(400).json({ error: !name || !email ? 'Name and email are required.' : 'Password must contain at least 6 characters.' });
    const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
    if (!snapshot.empty) return res.status(409).json({ error: 'Account already exists.' });
    const ownerEmail = normalizeEmail(req.auth.email);
    const authUser = await ensureFirebaseAuthUser({ email, password, name, role, ownerEmail, emailVerified: true });
    const user = {
      authUid: authUser.uid,
      name,
      email,
      role,
      ownerEmail,
      phone: req.body.phone || '',
      employmentStatus: req.body.employmentStatus === 'Inactive' ? 'Inactive' : 'Active',
      crewRole: String(req.body.crewRole || ''),
      address: String(req.body.address || ''),
      emergencyContact: String(req.body.emergencyContact || ''),
      profileNotes: String(req.body.profileNotes || ''),
      customerId: String(req.body.customerId || ''),
      customerName: String(req.body.customerName || ''),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    if (['crew', 'customer', 'administrator'].includes(role) && user.employmentStatus === 'Inactive') {
      await admin.auth().updateUser(authUser.uid, { disabled: true });
      await admin.auth().revokeRefreshTokens(authUser.uid);
    }
    const docRef = await db.collection('users').add(user);
    res.json({
      success: true,
      user: publicUser({ firestoreId: docRef.id, id: authUser.uid, ...user })
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/team/resend-verification', requireAuth, requireVerifiedAuth, async (req, res) => {
  try {
    const profile = await userProfileForAuth(req.auth);
    if (!profile || profile.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' });
    const authUid = String(req.body.authUid || '').trim();
    const email = normalizeEmail(req.body.email);
    const snapshot = authUid
      ? await db.collection('users').where('authUid', '==', authUid).limit(1).get()
      : await db.collection('users').where('email', '==', email).limit(1).get();
    if (snapshot.empty) return res.status(404).json({ error: 'Team account not found.' });
    const target = snapshot.docs[0].data();
    if (normalizeEmail(target.ownerEmail) !== normalizeEmail(req.auth.email)) {
      return res.status(403).json({ error: 'Team account access denied.' });
    }
    await sendVerificationEmailForUser(target.authUid);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/team/update', requireAuth, requireVerifiedAuth, async (req, res) => {
  try {
    const profile = await userProfileForAuth(req.auth);
    if (!profile || profile.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' });

    const authUid = String(req.body.authUid || '').trim();
    const currentEmail = normalizeEmail(req.body.currentEmail);
    let snapshot = authUid
      ? await db.collection('users').where('authUid', '==', authUid).limit(1).get()
      : await db.collection('users').where('email', '==', currentEmail).limit(1).get();
    if (snapshot.empty) return res.status(404).json({ error: 'Team account not found.' });

    const targetDoc = snapshot.docs[0];
    const target = targetDoc.data();
    const ownerEmail = normalizeEmail(req.auth.email);
    if (normalizeEmail(target.ownerEmail) !== ownerEmail) return res.status(403).json({ error: 'Team account access denied.' });

    const name = String(req.body.name || target.name || '').trim();
    const email = normalizeEmail(req.body.email || target.email);
    const password = String(req.body.password || '');
    const role = ['administrator', 'crew', 'customer'].includes(req.body.role) ? req.body.role : target.role;
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required.' });
    if (password) {
      if (password.length < 6) return res.status(400).json({ error: 'Password must contain at least 6 characters.' });
    }

    const emailChanged = email !== normalizeEmail(target.email);
    if (emailChanged) {
      const duplicate = await db.collection('users').where('email', '==', email).limit(1).get();
      if (!duplicate.empty && duplicate.docs[0].id !== targetDoc.id) {
        return res.status(409).json({ error: 'Email is already used by another account.' });
      }
    }

    const targetAuthUid = target.authUid || authUid;
    if (!targetAuthUid) return res.status(400).json({ error: 'Team account is not linked to Firebase Authentication.' });
    const employmentStatus = req.body.employmentStatus === 'Inactive' ? 'Inactive' : 'Active';
    const deactivateAccount = ['crew', 'customer', 'administrator'].includes(role) && employmentStatus === 'Inactive';
    const authUpdate = { displayName: name, email, emailVerified: true, disabled: deactivateAccount };
    if (password) authUpdate.password = password;
    await admin.auth().updateUser(targetAuthUid, authUpdate);
    await admin.auth().setCustomUserClaims(targetAuthUid, { role, ownerEmail });

    const updated = {
      authUid: targetAuthUid,
      name,
      email,
      role,
      ownerEmail,
      phone: String(req.body.phone || ''),
      employmentStatus,
      crewRole: String(req.body.crewRole || ''),
      address: String(req.body.address || ''),
      emergencyContact: String(req.body.emergencyContact || ''),
      profileNotes: String(req.body.profileNotes || ''),
      customerId: String(req.body.customerId || ''),
      customerName: String(req.body.customerName || ''),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await targetDoc.ref.set(updated, { merge: true });
    if (deactivateAccount) await admin.auth().revokeRefreshTokens(targetAuthUid);
    res.json({ success: true, user: publicUser({ firestoreId: targetDoc.id, ...target, ...updated }) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Customers may maintain their own contact and property details without being
// able to change any business, billing, or access-control data.
app.post('/api/auth/profile/update', requireAuth, requireVerifiedAuth, async (req, res) => {
  try {
    const profile = await userProfileForAuth(req.auth);
    if (!profile || profile.role !== 'customer') return res.status(403).json({ error: 'Customer access required.' });
    const name = String(req.body.name || '').trim();
    const phone = String(req.body.phone || '').trim();
    const address = String(req.body.address || '').trim();
    const profileNotes = String(req.body.profileNotes || '').trim();
    const password = String(req.body.password || '');
    if (!name || !phone || !address) return res.status(400).json({ error: 'Name, phone, and property address are required.' });
    if (password && password.length < 6) return res.status(400).json({ error: 'Your new password must contain at least 6 characters.' });

    const ownerEmail = normalizeEmail(profile.ownerEmail);
    const profileSnapshot = await db.collection('users').where('authUid', '==', req.auth.uid).limit(1).get();
    if (profileSnapshot.empty) return res.status(404).json({ error: 'Customer login not found.' });
    const profileDoc = profileSnapshot.docs[0];
    const previousName = String(profile.name || '').trim();
    const customerId = String(profile.customerId || '').trim();
    const workspaceRef = db.collection('workspaces').doc(ownerEmail);
    const workspaceSnapshot = await workspaceRef.get();
    if (!workspaceSnapshot.exists) return res.status(404).json({ error: 'Your service workspace was not found.' });
    const workspace = cleanWorkspaceData(workspaceSnapshot.data()?.data || workspaceSnapshot.data());
    const customerIndex = workspace.customers.findIndex(item =>
      (customerId && String(item.id || '') === customerId) || normalizeEmail(item.email) === normalizeEmail(profile.email)
    );
    if (customerIndex < 0) return res.status(404).json({ error: 'Your customer profile was not found.' });
    const customer = {
      ...workspace.customers[customerIndex],
      name,
      phone,
      address,
      notes: profileNotes,
      updatedAt: Date.now()
    };
    workspace.customers[customerIndex] = customer;
    const matchesCustomer = record => (customerId && String(record.customerId || '') === customerId) || normalizeEmail(record.customer) === normalizeEmail(previousName);
    ['jobs', 'estimates', 'invoices'].forEach(collection => {
      workspace[collection] = workspace[collection].map(record => matchesCustomer(record)
        ? { ...record, customer: name, customerId: customer.id || customerId, customerAddress: address, updatedAt: Date.now() }
        : record);
    });
    workspace.teamAccounts = workspace.teamAccounts.map(account => String(account.authUid || '') === String(req.auth.uid)
      ? { ...account, name, phone, address, profileNotes, customerName: name, updatedAt: Date.now() }
      : account);
    await admin.auth().updateUser(req.auth.uid, { displayName: name, ...(password ? { password } : {}) });
    const userUpdate = { name, phone, address, profileNotes, customerName: name, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    await profileDoc.ref.set(userUpdate, { merge: true });
    await workspaceRef.set({ data: workspace, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    res.json({ success: true, user: publicUser({ ...profile, ...userUpdate }), customer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Removing a customer profile preserves amount-only business records while
// erasing the customer's login and personal details from the workspace.
app.post('/api/auth/profile/delete', requireAuth, requireVerifiedAuth, async (req, res) => {
  try {
    const profile = await userProfileForAuth(req.auth);
    if (!profile || profile.role !== 'customer') return res.status(403).json({ error: 'Customer access required.' });
    const ownerEmail = normalizeEmail(profile.ownerEmail);
    const customerId = String(profile.customerId || '').trim();
    const profileSnapshot = await db.collection('users').where('authUid', '==', req.auth.uid).limit(1).get();
    const workspaceRef = db.collection('workspaces').doc(ownerEmail);
    const workspaceSnapshot = await workspaceRef.get();
    if (!workspaceSnapshot.exists) return res.status(404).json({ error: 'Your service workspace was not found.' });
    const workspace = cleanWorkspaceData(workspaceSnapshot.data()?.data || workspaceSnapshot.data());
    const customer = workspace.customers.find(item => (customerId && String(item.id || '') === customerId) || normalizeEmail(item.email) === normalizeEmail(profile.email));
    const oldName = normalizeEmail(customer?.name || profile.customerName || profile.name);
    const matchesCustomer = record => (customerId && String(record.customerId || '') === customerId) || normalizeEmail(record.customer) === oldName;
    workspace.customers = workspace.customers.filter(item => !((customerId && String(item.id || '') === customerId) || normalizeEmail(item.email) === normalizeEmail(profile.email)));
    ['jobs', 'estimates', 'invoices'].forEach(collection => {
      workspace[collection] = workspace[collection].map(record => matchesCustomer(record)
        ? { ...record, customer: 'Deleted customer', customerId: '', customerAddress: '', customerEmail: '', sharedCustomerId: '', sentAt: '', sentToCustomerAt: '', updatedAt: Date.now() }
        : record);
    });
    workspace.notifications = workspace.notifications.filter(item => !String(item.audience || '').startsWith('customer:'));
    workspace.teamAccounts = workspace.teamAccounts.filter(account => String(account.authUid || '') !== String(req.auth.uid) && normalizeEmail(account.email) !== normalizeEmail(profile.email));
    await workspaceRef.set({ data: workspace, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    if (!profileSnapshot.empty) await profileSnapshot.docs[0].ref.delete();
    await admin.auth().deleteUser(req.auth.uid).catch(error => { if (error.code !== 'auth/user-not-found') throw error; });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/team/delete', requireAuth, requireVerifiedAuth, async (req, res) => {
  let disabledAuthUid = '';
  try {
    const profile = await userProfileForAuth(req.auth);
    if (!profile || profile.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' });

    const authUid = String(req.body.authUid || '').trim();
    const email = normalizeEmail(req.body.email);
    const snapshot = authUid
      ? await db.collection('users').where('authUid', '==', authUid).limit(1).get()
      : await db.collection('users').where('email', '==', email).limit(1).get();
    if (snapshot.empty) return res.status(404).json({ error: 'User login not found.' });

    const targetDoc = snapshot.docs[0];
    const target = targetDoc.data();
    const ownerEmail = normalizeEmail(req.auth.email);
    if (normalizeEmail(target.ownerEmail) !== ownerEmail) return res.status(403).json({ error: 'User login access denied.' });
    if ((target.authUid && target.authUid === req.auth.uid) || normalizeEmail(target.email) === ownerEmail) {
      return res.status(400).json({ error: 'The active Admin account cannot be deleted.' });
    }

    let targetAuthUid = String(target.authUid || authUid || '').trim();
    if (!targetAuthUid && target.email) {
      try {
        targetAuthUid = (await admin.auth().getUserByEmail(normalizeEmail(target.email))).uid;
      } catch (error) {
        if (error.code !== 'auth/user-not-found') throw error;
      }
    }
    if (targetAuthUid) {
      try {
        await admin.auth().updateUser(targetAuthUid, { disabled: true });
        disabledAuthUid = targetAuthUid;
      } catch (error) {
        if (error.code !== 'auth/user-not-found') throw error;
      }
    }

    const workspaceRef = db.collection('workspaces').doc(ownerEmail);
    const workspaceSnapshot = await workspaceRef.get();
    const batch = db.batch();
    // Keep the account profile so Data & Backup can restore this login later.
    batch.set(targetDoc.ref, {
      deleted: true,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      deletedBy: ownerEmail
    }, { merge: true });
    if (workspaceSnapshot.exists) {
      const saved = workspaceSnapshot.data() || {};
      const workspaceData = cleanWorkspaceData(saved.data || saved);
      workspaceData.teamAccounts = workspaceData.teamAccounts.filter(account => {
        const sameUid = targetAuthUid && String(account.authUid || account.id || '') === targetAuthUid;
        const sameEmail = normalizeEmail(account.email) === normalizeEmail(target.email);
        return !sameUid && !sameEmail;
      });
      batch.set(workspaceRef, {
        ownerEmail,
        data: workspaceData,
        updatedBy: ownerEmail,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
    await batch.commit();

    res.json({ success: true });
  } catch (error) {
    if (disabledAuthUid) {
      await admin.auth().updateUser(disabledAuthUid, { disabled: false }).catch(() => {});
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/team/restore', requireAuth, requireVerifiedAuth, async (req, res) => {
  try {
    const profile = await userProfileForAuth(req.auth);
    if (!profile || profile.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' });
    const authUid = String(req.body.authUid || '').trim();
    const email = normalizeEmail(req.body.email);
    const snapshot = authUid
      ? await db.collection('users').where('authUid', '==', authUid).limit(1).get()
      : await db.collection('users').where('email', '==', email).limit(1).get();
    if (snapshot.empty) return res.status(404).json({ error: 'Deleted user login is no longer available to restore.' });

    const targetDoc = snapshot.docs[0];
    const target = targetDoc.data();
    const ownerEmail = normalizeEmail(req.auth.email);
    if (normalizeEmail(target.ownerEmail) !== ownerEmail) return res.status(403).json({ error: 'User login access denied.' });
    if (!target.deleted) return res.status(409).json({ error: 'This user login is already active.' });

    const targetAuthUid = String(target.authUid || authUid || '').trim();
    if (!targetAuthUid) return res.status(400).json({ error: 'This user login cannot be restored.' });
    await admin.auth().updateUser(targetAuthUid, { disabled: false });
    await targetDoc.ref.set({
      deleted: false,
      restoredAt: admin.firestore.FieldValue.serverTimestamp(),
      restoredBy: ownerEmail
    }, { merge: true });

    const restoredUser = publicUser({ firestoreId: targetDoc.id, ...target, authUid: targetAuthUid, deleted: false });
    const workspaceRef = db.collection('workspaces').doc(ownerEmail);
    const workspaceSnapshot = await workspaceRef.get();
    if (workspaceSnapshot.exists) {
      const saved = workspaceSnapshot.data() || {};
      const workspaceData = cleanWorkspaceData(saved.data || saved);
      const alreadyPresent = workspaceData.teamAccounts.some(account =>
        String(account.authUid || account.id || '') === targetAuthUid || normalizeEmail(account.email) === normalizeEmail(target.email)
      );
      if (!alreadyPresent) workspaceData.teamAccounts.push(restoredUser);
      await workspaceRef.set({
        ownerEmail,
        data: workspaceData,
        updatedBy: ownerEmail,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
    res.json({ success: true, user: restoredUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/workspace/:ownerEmail', requireAuth, requireVerifiedAuth, async (req, res) => {
  try {
    let profile = await userProfileForAuth(req.auth);
    profile = await repairCustomerWorkspaceLink(profile);
    const ownerEmail = workspaceOwnerFrom(req, profile);
    // A customer browser can still have the previous workspace owner cached
    // immediately after its login is repaired. Use the authenticated profile's
    // repaired owner in that case; administrators and crew remain restricted
    // to the owner requested in the URL.
    if (profile?.role !== 'customer' && normalizeEmail(req.params.ownerEmail) !== ownerEmail) {
      return res.status(403).json({ error: 'Workspace access denied.' });
    }

    const doc = await db.collection('workspaces').doc(ownerEmail).get();
    if (!doc.exists) {
      return res.json({ success: true, data: null });
    }

    const saved = doc.data() || {};
    const workspaceData = cleanWorkspaceData(saved.data || saved);
    // Customers receive only their own records that the Admin has explicitly
    // shared by sending the estimate, job summary, or invoice.
    const responseData = profile?.role === 'customer'
      ? customerPortalWorkspace(workspaceData, profile)
      : workspaceData;
    res.json({ success: true, data: responseData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PDFs in the customer portal are generated only after the requested record
// has been scoped to the authenticated customer. This prevents a customer
// from accessing another customer's document by changing its URL.
app.get('/api/customer-records/:kind/:recordId/pdf', requireAuth, requireVerifiedAuth, async (req, res) => {
  try {
    const profile = await repairCustomerWorkspaceLink(await userProfileForAuth(req.auth));
    if (!profile || profile.role !== 'customer') return res.status(403).json({ error: 'Customer account access is required.' });
    const collectionByKind = { job: 'jobs', estimate: 'estimates', invoice: 'invoices' };
    const kind = String(req.params.kind || '').toLowerCase();
    const collection = collectionByKind[kind];
    if (!collection) return res.status(400).json({ error: 'Unsupported customer document.' });
    const ownerEmail = workspaceOwnerFrom(req, profile);
    const snapshot = await db.collection('workspaces').doc(ownerEmail).get();
    if (!snapshot.exists) return res.status(404).json({ error: 'This shared record is no longer available.' });

    const workspace = cleanWorkspaceData(snapshot.data()?.data || snapshot.data());
    const customerWorkspace = customerPortalWorkspace(workspace, profile);
    const record = customerWorkspace[collection].find(item => String(item.id || '') === String(req.params.recordId || '').trim());
    if (!record) return res.status(404).json({ error: 'This PDF is not available in your customer account.' });

    const customer = customerWorkspace.customers[0] || {};
    const company = {
      name: workspace.settings?.companyName || 'GreenOps', email: workspace.settings?.email || '',
      phone: workspace.settings?.phone || '', website: workspace.settings?.website || '', address: workspace.settings?.address || '',
      companyLogoDataUrl: workspace.settings?.companyLogoDataUrl || ''
    };
    const common = {...record, customer: customer.name || record.customer || '', customerName: customer.name || record.customer || '', customerAddress: customer.address || record.address || '', customerEmail: customer.email || profile.email || ''};
    let pdf; let filename;
    if (kind === 'job') {
      pdf = await createJobPdf(common, company);
      filename = `JOB-${String(record.id || '').replace(/^#?JOB-/i, '')}.pdf`;
    } else if (kind === 'estimate') {
      pdf = await createEstimatePdf({...common, createdDate: record.createdDate || record.estimateDate || '', validUntil: record.expirationDate || record.validUntil || ''}, company);
      filename = `${String(record.id || 'estimate').replace(/[^A-Za-z0-9_-]/g, '-')}.pdf`;
    } else {
      const total = Number(record.total ?? record.amount ?? 0);
      const paid = Number(record.paid ?? record.paymentAmount ?? 0);
      const due = Number(record.dueAmount ?? Math.max(0, total - paid));
      pdf = await createInvoicePdf({...common, invoiceDate: record.invoiced || record.invoiceDate || '', dueDate: record.dueDate || '', total, paid, due, subtotal: Number(record.subtotal ?? total), tax: Number(record.tax ?? 0), discount: Number(record.discount ?? 0)}, company);
      filename = `${String(record.id || 'invoice').replace(/[^A-Za-z0-9_-]/g, '-')}.pdf`;
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(pdf);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Unable to prepare this PDF.' });
  }
});

app.post('/api/workspace/save', requireAuth, requireVerifiedAuth, async (req, res) => {
  try {
    const profile = await userProfileForAuth(req.auth);
    const ownerEmail = workspaceOwnerFrom(req, profile);

    if (profile?.role === 'customer') {
      return res.status(403).json({ error: 'Customer accounts are view-only.' });
    }

    const data = cleanWorkspaceData(req.body.data || {});
    const workspaceRef = db.collection('workspaces').doc(ownerEmail);
    const existing = await workspaceRef.get();
    const existingData = existing.exists ? cleanWorkspaceData(existing.data()?.data || existing.data()) : {};
    // Full browser saves contain editable data only. Retain the delivery links
    // created by the secure customer-share endpoint.
    if (!data.customerShares.length && existingData.customerShares.length) {
      data.customerShares = existingData.customerShares;
    }
    if (workspaceRecordCount(data) === 0 && workspaceRecordCount(existingData) > 0) {
      return res.status(409).json({ error: 'Protected existing workspace data from an empty overwrite.' });
    }
    await workspaceRef.set({
      ownerEmail,
      data,
      updatedBy: normalizeEmail(req.auth.email),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sending a record must also share it from the server. This avoids relying on
// a browser save after the email has already been sent.
async function shareWorkspaceRecordWithCustomer(req, profile, kind, recordId, customerEmail) {
  const ownerEmail = workspaceOwnerFrom(req, profile);
  const workspaceRef = db.collection('workspaces').doc(ownerEmail);
  const snapshot = await workspaceRef.get();
  if (!snapshot.exists) return false;

  const workspace = cleanWorkspaceData(snapshot.data()?.data || snapshot.data());
  const collectionByKind = { job: 'jobs', estimate: 'estimates', invoice: 'invoices' };
  const collection = collectionByKind[kind];
  const normalizeRecordId = value => String(value || '').trim().replace(/^#?JOB-/i, '');
  const record = collection && workspace[collection].find(item =>
    String(item.id) === String(recordId) || normalizeRecordId(item.id) === normalizeRecordId(recordId)
  );
  if (!record) return false;

  // The delivery choice is made for a specific email address. Prefer that
  // exact match over any older customerId/name saved on a job, otherwise an
  // old duplicate customer record can receive the notification while the
  // intended customer's portal stays empty.
  const recipientEmail = normalizeEmail(customerEmail);
  const customer = (recipientEmail && workspace.customers.find(item =>
    normalizeEmail(item.email) === recipientEmail
  )) || (record.customerId && workspace.customers.find(item =>
    String(item.id) === String(record.customerId)
  )) || workspace.customers.find(item =>
    normalizeEmail(item.name) === normalizeEmail(record.customer)
  );
  if (!customer) return false;

  // A portal delivery is only valid when the selected customer has a real
  // customer login. This prevents a successful-looking send from creating a
  // notification for a person who cannot sign in to view the shared job.
  const customerEmailForLogin = normalizeEmail(customer.email || recipientEmail);
  const customerLogin = customerEmailForLogin
    ? await db.collection('users').where('email', '==', customerEmailForLogin).limit(1).get()
    : null;
  const loginProfile = customerLogin?.empty ? null : customerLogin.docs[0];
  if (!loginProfile || String(loginProfile.data()?.role || '').toLowerCase() !== 'customer') {
    const error = new Error(`No customer login is linked to ${customer.name || 'this customer'}. Create or link their customer account before sharing.`);
    error.code = 'CUSTOMER_LOGIN_NOT_LINKED';
    throw error;
  }

  const now = Date.now();
  const customerId = String(customer.id || normalizeEmail(customer.email) || '').trim();
  // Repair an older customer login when its customer ID was blank or when a
  // customer record was recreated. The email remains the trusted match.
  await loginProfile.ref.set({
    customerId,
    customerName: String(customer.name || '').trim(),
    ownerEmail
  }, { merge: true });
  record.customerId = String(customer.id || record.customerId || '');
  record.sharedCustomerId = customerId;
  record.customerEmail = String(customer.email || record.customerEmail || '').trim();
  record.sharedCustomerEmail = normalizeEmail(customer.email || recipientEmail);
  record.sharedCustomerName = String(customer.name || record.customer || '').trim();
  record.sentAt = new Date(now).toISOString().slice(0, 10);
  record.sentToCustomerAt = now;
  workspace.customerShares = Array.isArray(workspace.customerShares) ? workspace.customerShares : [];
  workspace.customerShares = [
    {
      kind,
      recordId: String(record.id),
      customerId,
      customerEmail: normalizeEmail(customer.email || recipientEmail),
      customerName: String(customer.name || record.customer || '').trim(),
      sharedAt: now
    },
    ...workspace.customerShares.filter(link => !(
      String(link?.kind || '').toLowerCase() === kind
      && String(link?.recordId || '') === String(record.id)
      && String(link?.customerId || '') === customerId
    ))
  ].slice(0, 500);

  const label = kind === 'job' ? `#JOB-${record.id}` : String(record.id);
  workspace.notifications = [
    {
      id: `NOTICE-${now}-${Math.random().toString(36).slice(2, 7)}`,
      audience: `customer:${customerId}`,
      kind,
      recordId: String(record.id),
      severity: 'info',
      title: `New ${kind} shared`,
      detail: `${label} · ${record.service || 'Service record'} has been sent to you.`,
      createdAt: now
    },
    ...workspace.notifications.filter(item => !(String(item.audience) === `customer:${customerId}` && item.kind === kind && String(item.recordId) === String(record.id)))
  ].slice(0, 40);

  await workspaceRef.set({
    ownerEmail,
    data: workspace,
    updatedBy: normalizeEmail(req.auth.email),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  return true;
}

// Account-only delivery must be persisted on the server as well. Previously
// this depended on a later browser workspace save, which could leave a
// customer with a notification but no visible job if that save was delayed.
app.post('/api/customer-records/share', requireAuth, requireVerifiedAuth, async (req, res) => {
  try {
    const profile = await userProfileForAuth(req.auth);
    if (!profile || ['crew', 'customer'].includes(profile.role)) {
      return res.status(403).json({ error: 'Management access is required to share customer records.' });
    }
    const kind = String(req.body.kind || '').toLowerCase();
    if (!['job', 'estimate', 'invoice'].includes(kind)) {
      return res.status(400).json({ error: 'Unsupported customer record.' });
    }
    const shared = await shareWorkspaceRecordWithCustomer(
      req,
      profile,
      kind,
      req.body.recordId,
      req.body.customerEmail
    );
    if (!shared) return res.status(404).json({ error: 'The record or customer could not be found.' });
    res.json({ success: true });
  } catch (error) {
    const status = error.code === 'CUSTOMER_LOGIN_NOT_LINKED' ? 409 : 500;
    res.status(status).json({ error: error.message || 'Unable to share this record with the customer.' });
  }
});

app.post('/api/invoices/send-email', requireAuth, requireVerifiedAuth, async (req, res) => {
  try {
    const profile=await userProfileForAuth(req.auth);
    if(!profile || profile.role==='crew') return res.status(403).json({error:'Management access required.'});
    const transport=smtpTransport();
    if(!transport) return res.status(503).json({error:'Automatic email is not configured.',code:'EMAIL_NOT_CONFIGURED'});
    const to=normalizeEmail(req.body.to);
    if(!/^\S+@\S+\.\S+$/.test(to)) return res.status(400).json({error:'A valid customer email is required.'});
    const invoice=req.body.invoice && typeof req.body.invoice==='object' ? req.body.invoice : null;
    if(!invoice?.id) return res.status(400).json({error:'Invoice details are required.'});
    const company=req.body.company && typeof req.body.company==='object' ? req.body.company : {};
    const companyName=String(company.name || profile.companyName || 'GreenOps').slice(0,120);
    const sender=configuredAdminSender(req,profile,companyName,company.email);
    const pdf=await createInvoicePdf(invoice,{...company,name:companyName,email:sender.email});
    const subject=`Invoice ${String(invoice.id).slice(0,80)} from ${companyName}`;
    await transport.sendMail({
      from:sender.from,
      to,
      replyTo:sender.replyTo,
      subject,
      text:`Hello ${String(invoice.customer || 'Customer')},\n\nYour invoice ${String(invoice.id)} from ${companyName} is attached.\nInvoice total: ${currency(invoice.total)}\nBalance due: ${currency(invoice.due)}\nDue date: ${String(invoice.dueDate || '')}\n\nRegards,\n${companyName}`,
      html:`<p>Hello ${String(invoice.customer || 'Customer').replace(/[<>&]/g,'')},</p><p>Your invoice <strong>${String(invoice.id).replace(/[<>&]/g,'')}</strong> from ${companyName.replace(/[<>&]/g,'')} is attached.</p><p><strong>Invoice total:</strong> ${currency(invoice.total)}<br><strong>Balance due:</strong> ${currency(invoice.due)}<br><strong>Due date:</strong> ${String(invoice.dueDate || '').replace(/[<>&]/g,'')}</p><p>Regards,<br>${companyName.replace(/[<>&]/g,'')}</p>`,
      attachments:[{filename:`${String(invoice.id).replace(/[^A-Za-z0-9_-]/g,'-')}.pdf`,content:pdf,contentType:'application/pdf'}]
    });
    if (req.body.shareToAccount !== false) {
      const shared = await shareWorkspaceRecordWithCustomer(req, profile, 'invoice', invoice.id, to);
      if (!shared) throw Object.assign(new Error('Invoice email was sent, but the invoice could not be linked to this customer account.'), { code: 'CUSTOMER_SHARE_FAILED' });
    }
    res.json({success:true});
  } catch (error) {
    console.error(`Invoice email failed: ${error.message}`);
    const status=error.code==='EMAIL_NOT_CONFIGURED' ? 503 : error.code==='COMPANY_EMAIL_REQUIRED' ? 400 : error.code==='SMTP_SENDER_MISMATCH' ? 409 : 500;
    res.status(status).json({error:error.message || 'Unable to send the invoice email.',code:error.code || ''});
  }
});

app.post('/api/estimates/send-email', requireAuth, requireVerifiedAuth, async (req, res) => {
  try {
    const profile=await userProfileForAuth(req.auth);
    if(!profile || profile.role==='crew') return res.status(403).json({error:'Management access required.'});
    const transport=smtpTransport();
    if(!transport) return res.status(503).json({error:'Automatic email is not configured. Add the admin SMTP settings first.',code:'EMAIL_NOT_CONFIGURED'});
    const to=normalizeEmail(req.body.to);
    if(!/^\S+@\S+\.\S+$/.test(to)) return res.status(400).json({error:'A valid customer email is required.'});
    const estimate=req.body.estimate && typeof req.body.estimate==='object' ? req.body.estimate : null;
    if(!estimate?.id) return res.status(400).json({error:'Estimate details are required.'});
    const company=req.body.company && typeof req.body.company==='object' ? req.body.company : {};
    const companyName=String(company.name || profile.companyName || 'GreenOps').slice(0,120);
    const sender=configuredAdminSender(req,profile,companyName,company.email);
    const pdf=await createEstimatePdf(estimate,{...company,name:companyName,email:sender.email});
    await transport.sendMail({
      from:sender.from,
      to,
      replyTo:sender.replyTo,
      subject:`Estimate ${String(estimate.id).slice(0,80)} from ${companyName}`,
      text:`Hello ${String(estimate.customer || 'Customer')},\n\nYour estimate ${String(estimate.id)} from ${companyName} is attached.\nEstimated amount: ${currency(estimate.amount)}\nValid until: ${String(estimate.validUntil || '')}\n\nRegards,\n${companyName}`,
      html:`<p>Hello ${String(estimate.customer || 'Customer').replace(/[<>&]/g,'')},</p><p>Your estimate <strong>${String(estimate.id).replace(/[<>&]/g,'')}</strong> from ${companyName.replace(/[<>&]/g,'')} is attached.</p><p><strong>Estimated amount:</strong> ${currency(estimate.amount)}<br><strong>Valid until:</strong> ${String(estimate.validUntil || '').replace(/[<>&]/g,'')}</p><p>Regards,<br>${companyName.replace(/[<>&]/g,'')}</p>`,
      attachments:[{filename:`${String(estimate.id).replace(/[^A-Za-z0-9_-]/g,'-')}.pdf`,content:pdf,contentType:'application/pdf'}]
    });
    if (req.body.shareToAccount !== false) {
      const shared = await shareWorkspaceRecordWithCustomer(req, profile, 'estimate', estimate.id, to);
      if (!shared) throw Object.assign(new Error('Estimate email was sent, but the estimate could not be linked to this customer account.'), { code: 'CUSTOMER_SHARE_FAILED' });
    }
    res.json({success:true});
  } catch (error) {
    console.error(`Estimate email failed: ${error.message}`);
    const status=error.code==='EMAIL_NOT_CONFIGURED' ? 503 : error.code==='COMPANY_EMAIL_REQUIRED' ? 400 : error.code==='SMTP_SENDER_MISMATCH' ? 409 : 500;
    res.status(status).json({error:error.message || 'Unable to send the estimate email.',code:error.code || ''});
  }
});

app.post('/api/jobs/send-email', requireAuth, requireVerifiedAuth, async (req, res) => {
  try {
    const profile=await userProfileForAuth(req.auth);
    if(!profile || profile.role==='crew') return res.status(403).json({error:'Management access required.'});
    const transport=smtpTransport();
    if(!transport) return res.status(503).json({error:'Automatic email is not configured.',code:'EMAIL_NOT_CONFIGURED'});
    const to=normalizeEmail(req.body.to);
    if(!/^\S+@\S+\.\S+$/.test(to)) return res.status(400).json({error:'A valid customer email is required.'});
    const job=req.body.job && typeof req.body.job==='object' ? req.body.job : null;
    if(!job?.id) return res.status(400).json({error:'Job details are required.'});
    const company=req.body.company && typeof req.body.company==='object' ? req.body.company : {};
    const companyName=String(company.name || profile.companyName || 'GreenOps').slice(0,120);
    const sender=configuredAdminSender(req,profile,companyName,company.email);
    const pdf=await createJobPdf(job,{...company,name:companyName,email:sender.email});
    const jobNumber=`JOB-${String(job.id).replace(/^JOB-/i,'')}`;
    await transport.sendMail({
      from:sender.from,
      to,
      replyTo:sender.replyTo,
      subject:`Job ${jobNumber} from ${companyName}`,
      text:`Hello ${String(job.customer || 'Customer')},\n\nYour job summary for ${jobNumber} from ${companyName} is attached.\nService: ${String(job.service || '')}\nScheduled date: ${String(job.date || '')}\n\nRegards,\n${companyName}`,
      html:`<p>Hello ${String(job.customer || 'Customer').replace(/[<>&]/g,'')},</p><p>Your job summary for <strong>${jobNumber}</strong> from ${companyName.replace(/[<>&]/g,'')} is attached.</p><p><strong>Service:</strong> ${String(job.service || '').replace(/[<>&]/g,'')}<br><strong>Scheduled date:</strong> ${String(job.date || '').replace(/[<>&]/g,'')}</p><p>Regards,<br>${companyName.replace(/[<>&]/g,'')}</p>`,
      attachments:[{filename:`${jobNumber}.pdf`,content:pdf,contentType:'application/pdf'}]
    });
    if (req.body.shareToAccount !== false) {
      const shared = await shareWorkspaceRecordWithCustomer(req, profile, 'job', job.id, to);
      if (!shared) {
        throw Object.assign(new Error('Job email was sent, but the job could not be linked to this customer account.'), { code: 'CUSTOMER_SHARE_FAILED' });
      }
    }
    res.json({success:true});
  } catch (error) {
    console.error(`Job email failed: ${error.message}`);
    const status=error.code==='EMAIL_NOT_CONFIGURED' ? 503 : error.code==='COMPANY_EMAIL_REQUIRED' ? 400 : error.code==='SMTP_SENDER_MISMATCH' ? 409 : 500;
    res.status(status).json({error:error.message || 'Unable to send the job email.',code:error.code || ''});
  }
});

app.post('/api/jobs/notify-crew', requireAuth, requireVerifiedAuth, async (req, res) => {
  try {
    const profile=await userProfileForAuth(req.auth);
    if(!profile || profile.role==='crew' || profile.role==='customer') return res.status(403).json({error:'Management access required.'});
    const job=req.body.job && typeof req.body.job==='object' ? req.body.job : null;
    if(!job?.id || !job?.date) return res.status(400).json({error:'Scheduled job details are required.'});
    const company=req.body.company && typeof req.body.company==='object' ? req.body.company : {};
    const companyName=String(company.name || profile.companyName || 'GreenOps').slice(0,120);
    const recipients=Array.isArray(req.body.recipients) ? req.body.recipients.slice(0,25) : [];
    const jobNumber=`JOB-${String(job.id).replace(/^JOB-/i,'')}`;
    const details=`${jobNumber} · ${String(job.service || 'Service visit')} for ${String(job.customer || 'Customer')} on ${String(job.date)}${job.time ? ` at ${String(job.time)}` : ''}`;
    const emailRecipients=[...new Map(recipients.map(recipient=>[normalizeEmail(recipient?.email),recipient]).filter(([email])=>/^\S+@\S+\.\S+$/.test(email))).values()];
    let emailSent=0;
    let emailWarning='';
    const transport=smtpTransport();
    if(emailRecipients.length && transport){
      try{
        const sender=configuredAdminSender(req,profile,companyName,company.email);
        const calendar=crewScheduleCalendarInvite(job,companyName);
        await Promise.all(emailRecipients.map(async recipient=>{
          await transport.sendMail({
            from:sender.from,
            to:normalizeEmail(recipient.email),
            replyTo:sender.replyTo,
            subject:`Scheduled job: ${jobNumber}`,
            text:`Hello ${String(recipient.name || 'Crew member')},\n\nYou have been scheduled for a job.\n${details}\n${job.address ? `Location: ${job.address}\n` : ''}\nA calendar invitation is attached.\n\n${companyName}`,
            html:`<p>Hello ${String(recipient.name || 'Crew member').replace(/[<>&]/g,'')},</p><p>You have been scheduled for a job.</p><p><strong>${details.replace(/[<>&]/g,'')}</strong>${job.address ? `<br><strong>Location:</strong> ${String(job.address).replace(/[<>&]/g,'')}` : ''}</p><p>A calendar invitation is attached.</p><p>${companyName.replace(/[<>&]/g,'')}</p>`,
            attachments:calendar ? [{filename:`${jobNumber}.ics`,content:calendar,contentType:'text/calendar; method=REQUEST; charset=UTF-8'}] : []
          });
        }));
        emailSent=emailRecipients.length;
      }catch(error){
        emailWarning=error.message || 'Email could not be sent.';
      }
    }else if(emailRecipients.length){
      emailWarning='Email is not configured.';
    }
    let smsSent=0;
    let callSent=0;
    const smsMessage=`GreenOps: You have a scheduled job. ${details}${job.address ? `. Location: ${String(job.address)}` : ''}`;
    const callMessage=`GreenOps notification. You have a scheduled job. ${jobNumber}, ${String(job.service || 'service visit')} for ${String(job.customer || 'customer')} on ${String(job.date)}${job.time ? ` at ${String(job.time)}` : ''}.`;
    for(const recipient of recipients){
      try{ if(await sendCrewScheduleSms(recipient?.phone,smsMessage)) smsSent+=1; }catch(error){ console.warn(`Crew SMS failed: ${error.message}`); }
      try{ if(await sendCrewScheduleCall(recipient?.phone,callMessage)) callSent+=1; }catch(error){ console.warn(`Crew call failed: ${error.message}`); }
    }
    res.json({success:true,emailSent,smsSent,callSent,emailWarning});
  } catch (error) {
    console.error(`Crew schedule notification failed: ${error.message}`);
    res.status(500).json({error:error.message || 'Unable to send crew schedule notifications.'});
  }
});

// Example: Save data
app.post('/api/data', requireAuth, requireVerifiedAuth, async (req, res) => {
  try {
    const docRef = await db.collection('data').add(req.body);
    res.json({ id: docRef.id, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Example: Get data
app.get('/api/data', requireAuth, requireVerifiedAuth, async (req, res) => {
  try {
    const snapshot = await db.collection('data').get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (_req, res) => res.json({ success: true }));

const backendDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendDirectory = path.resolve(backendDirectory, '..', 'public');
if (existsSync(path.join(frontendDirectory, 'index.html'))) {
  app.use(express.static(frontendDirectory, {
    etag: true,
    maxAge: 0,
    setHeaders(res, filePath) {
      if (/\.(html|js|css)$/i.test(filePath)) res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(frontendDirectory, 'index.html'));
  });
}

app.use((error, _req, res, _next) => {
  const status = error.message?.includes('CORS') ? 403 : 500;
  res.status(status).json({ error: status === 403 ? 'Origin is not allowed.' : 'Unexpected server error.' });
});

const PORT = Number(process.env.PORT || 3000);
try {
  await provisionBootstrapAdmin();
} catch (error) {
  console.error(`Bootstrap Admin provisioning failed: ${error.message}`);
}
if (process.env.GREENOPS_PDF_PREVIEW !== 'true') {
  app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
}

export { createInvoicePdf, createJobPdf };
