import { CartItem, SaleRecord, PrinterSettings } from '../types';

export const printReceipt = (record: SaleRecord, settings: PrinterSettings) => {
  const printWindow = window.open('', '', 'width=400,height=600');
  if (!printWindow) return;

  const itemsHtml = record.items.map(item => `
    <div class="item">
      <div class="row">
        <span>${item.name}</span>
      </div>
      <div class="row details">
        <span>${item.quantity} x ${item.price.toFixed(2)}</span>
        <span>${(item.quantity * item.price).toFixed(2)}</span>
      </div>
    </div>
  `).join('');

  const dateStr = new Date(record.timestamp).toLocaleString();

  // Map font sizes to CSS values
  const fontSizeMap = {
    small: '10px',
    medium: '12px',
    large: '14px'
  };
  const baseFontSize = fontSizeMap[settings.fontSize];
  
  // Scale headings relative to base font
  const h2Size = settings.fontSize === 'large' ? '18px' : (settings.fontSize === 'medium' ? '16px' : '14px');

  const html = `
    <html>
      <head>
        <title>Receipt ${record.id}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            width: ${settings.paperWidth};
            margin: 0;
            padding: 5px;
            font-size: ${baseFontSize};
            color: #000;
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
            border-bottom: 1px dashed #000;
            padding-bottom: 5px;
          }
          .header h2 { margin: 0; font-size: ${h2Size}; font-weight: bold; }
          .header p { margin: 2px 0; }
          
          .info {
            margin-bottom: 10px;
          }
          .row {
            display: flex;
            justify-content: space-between;
          }
          
          .items {
            border-bottom: 1px dashed #000;
            padding-bottom: 5px;
            margin-bottom: 5px;
          }
          .item {
            margin-bottom: 5px;
          }
          .details {
            color: #333;
          }
          
          .totals {
            text-align: right;
            margin-top: 10px;
          }
          .totals .row {
            font-weight: bold;
            font-size: 1.1em;
            margin-top: 5px;
          }
          
          .footer {
            text-align: center;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${settings.storeName}</h2>
          <p>${settings.address}</p>
          <p>TIN: ${settings.tin}</p>
        </div>
        
        <div class="info">
          <div class="row"><span>Txn ID:</span> <span>${record.id}</span></div>
          <div class="row"><span>Date:</span> <span>${dateStr}</span></div>
          <div class="row"><span>Cashier:</span> <span>${record.cashierName}</span></div>
          <div class="row"><span>Cust:</span> <span>${record.customerName}</span></div>
        </div>

        <div class="items">
          ${itemsHtml}
        </div>

        <div class="totals">
          <div class="row">
            <span>TOTAL</span>
            <span>PHP ${record.total.toFixed(2)}</span>
          </div>
          <div style="font-size: 0.9em; margin-top: 5px;">
            (VAT Included)
          </div>
        </div>

        <div class="footer">
          <p>${settings.footerMessage}</p>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  
  // Wait for content to load then print
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
};