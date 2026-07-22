const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

class InhabitationFileService {
  constructor(outputDir) {
    this.outputDir = outputDir;
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async generateReturnHomePackage(report) {
    const fileName = `return-home-${report.id}.pdf`;
    const filePath = path.join(this.outputDir, fileName);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const doc = new PDFDocument({ 
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      layout: 'portrait'
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    try {
      doc.font('C:\\Windows\\Fonts\\arial.ttf');
    } catch (e) {
      const fontPath = path.join(__dirname, 'fonts', 'NotoSansHebrew-Regular.ttf');
      if (fs.existsSync(fontPath)) {
        doc.font(fontPath);
      } else {
        doc.font('Helvetica');
      }
    }

    const title = 'קובץ שיבה למגורים';
    const buildingId = `מזהה בניין: ${report.id}`;
    const address = `כתובת: ${report.address}`;
    const apartments = `מספר דירות: ${report.apartmentsInBuilding}`;
    const eligibilityStatus = `סטטוס זכאות: ${report.eligibilityCheckPerformed ? 'כן' : 'לא'}`;
    const budgetStatus = `סטטוס תקציב: ${report.budgetRequestOpened ? 'כן' : 'לא'}`;
    const rehabilitationStatus = `סטטוס שיקום: ${this.translateStatus(report.status)}`;
    const canReinhabit = 'ניתן לשוב למגורים';

    const pageWidth = doc.page.width;
    const rightMargin = 50;
    const leftMargin = 50;
    const contentWidth = pageWidth - rightMargin - leftMargin;

    doc.fontSize(24).fillColor('#1f4f7a');
    doc.text(title, leftMargin, 80, { 
      width: contentWidth, 
      align: 'left' 
    });
    
    doc.fontSize(14).fillColor('#000000');
    const lineHeight = 30;
    let currentY = 140;

    doc.text(buildingId, leftMargin, currentY, { width: contentWidth, align: 'left' });
    currentY += lineHeight;
    
    doc.text(address, leftMargin, currentY, { width: contentWidth, align: 'left' });
    currentY += lineHeight;
    
    doc.text(apartments, leftMargin, currentY, { width: contentWidth, align: 'left' });
    currentY += lineHeight;
    
    doc.text(eligibilityStatus, leftMargin, currentY, { width: contentWidth, align: 'left' });
    currentY += lineHeight;
    
    doc.text(budgetStatus, leftMargin, currentY, { width: contentWidth, align: 'left' });
    currentY += lineHeight;
    
    doc.text(rehabilitationStatus, leftMargin, currentY, { width: contentWidth, align: 'left' });
    currentY += lineHeight + 20;

    doc.fontSize(18).fillColor('#0b6b2f');
    doc.text(canReinhabit, leftMargin, currentY, { width: contentWidth, align: 'left' });

    doc.end();

    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    return {
      fileName,
      url: `/files/${fileName}`,
    };
  }

  translateStatus(status) {
    const translations = {
      'WAITING_FOR_VALIDATION': 'ממתין לאימות',
      'NEW': 'חדש',
      'IN_REVIEW': 'בבדיקה',
      'Building in the process of restoration': 'בניין בתהליך שיקום',
      'Restoration process completed': 'תהליך השיקום הושלם'
    };
    return translations[status] || status;
  }
}

module.exports = { InhabitationFileService };
