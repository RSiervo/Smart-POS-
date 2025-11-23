import { CartItem, SaleRecord } from '../types';

export const printReceipt = (record: SaleRecord, storeName: string = "SmartSale Grocery") => {
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

  const html = `
    <html>
      <head>
        <title>Receipt ${record.id}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            width: 58mm; /* Standard Thermal Paper Width */
            margin: 0;
            padding: 5px;
            font-size: 12px;
            color: #000;
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
            border-bottom: 1px dashed #000;
            padding-bottom: 5px;
          }
          .header h2 { margin: 0; font-size: 16px; font-weight: bold; }
          .header p { margin: 2px 0; font-size: 10px; }
          
          .info {
            margin-bottom: 10px;
            font-size: 10px;
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
            font-size: 10px;
            color: #333;
          }
          
          .totals {
            text-align: right;
            margin-top: 10px;
          }
          .totals .row {
            font-weight: bold;
            font-size: 14px;
            margin-top: 5px;
          }
          
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${storeName}</h2>
          <p>Manila, Philippines</p>
          <p>TIN: 000-000-000-000</p>
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
          <div style="font-size: 10px; margin-top: 5px;">
            (VAT Included)
          </div>
        </div>

        <div class="footer">
          <p>Thank you for shopping!</p>
          <p>This serves as your official receipt.</p>
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