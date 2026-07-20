const fs = require('fs');
const path = require('path');

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

    const content = `\n%PDF-1.4
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids[3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox[0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj
4 0 obj<< /Length 220 >>stream
BT /F1 16 Tf 50 750 Td 0 0 0 rg (שם הקובץ: ${fileName}) Tj 0 -20 Td (מזהה בניין: ${report.id}) Tj 0 -20 Td (כתובת: ${report.address}) Tj 0 -20 Td (מספר דירות: ${report.apartmentsInBuilding}) Tj 0 -20 Td (סטטוס זכאות: ${report.eligibilityCheckPerformed ? 'כן' : 'לא'}) Tj 0 -20 Td (סטטוס תקציב: ${report.budgetRequestOpened ? 'כן' : 'לא'}) Tj 0 -20 Td (סטטוס שיקום: ${report.status}) Tj 0 -20 Td (ניתן לשוב למגורים) Tj ET
endstream
endobj
5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000062 00000 n 
0000000119 00000 n 
0000000206 00000 n 
0000000300 00000 n 
trailer<< /Size 6 /Root 1 0 R >>
startxref
0
%%EOF`;

    fs.writeFileSync(filePath, content, 'utf8');

    return {
      fileName,
      url: `/files/${fileName}`,
    };
  }
}

module.exports = { InhabitationFileService };
