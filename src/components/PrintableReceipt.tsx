import React from 'react';
import { X, Printer, CheckCircle2, Layers } from 'lucide-react';
import { Order } from '../types/index.ts';
import { useCurrency } from '../context/CurrencyContext.tsx';

interface PrintableReceiptProps {
  order: Order;
  onClose: () => void;
}

export function PrintableReceipt({ order, onClose }: PrintableReceiptProps) {
  const { format } = useCurrency();

  const handlePrint = () => {
    window.print();
  };

  const address = order.shippingAddress || (order.shippingAddressJson ? JSON.parse(order.shippingAddressJson) : {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 print:m-0 print:border-none print:shadow-none">
        {/* Actions bar (hidden during print) */}
        <div className="print:hidden p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">Official Tax Invoice & Order Receipt</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-8 space-y-6 text-slate-800 print:p-4">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">
                  COMMERCE<span className="text-indigo-600">ENGINE</span>
                </h1>
                <p className="text-xs text-slate-500 mt-1">Multi-Vendor Marketplace Platform</p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {order.status}
              </span>
              <p className="text-xs text-slate-500 mt-2">
                Date: {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Order Details & Addresses */}
          <div className="grid grid-cols-2 gap-6 text-xs">
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">Invoice Details</span>
              <p className="font-semibold text-slate-900 text-sm">Order #{order.orderNumber}</p>
              <p className="text-slate-600 mt-1">Payment Method: <span className="font-medium text-slate-800">{order.paymentMethod === 'DEMO_CARD' ? 'Card Payment (Sandbox)' : 'Cash on Delivery'}</span></p>
              <p className="text-slate-600">Payment Status: <span className="font-semibold text-emerald-700">{order.paymentStatus}</span></p>
              {order.payment?.transactionReference && (
                <p className="text-slate-500 font-mono mt-0.5">Ref: {order.payment.transactionReference}</p>
              )}
            </div>

            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">Shipping Destination</span>
              <p className="font-semibold text-slate-900">{address.fullName || 'Customer'}</p>
              <p className="text-slate-600">{address.addressLine1}</p>
              {address.addressLine2 && <p className="text-slate-600">{address.addressLine2}</p>}
              <p className="text-slate-600">{address.city}, {address.state} - {address.pincode}</p>
              <p className="text-slate-600">Phone: {address.phone}</p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Item Description</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3 text-right">Price</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="p-3">
                        <span className="font-semibold text-slate-900 block">{item.productName}</span>
                        {item.variantTitle && (
                          <span className="text-[11px] text-slate-500 block">Variant: {item.variantTitle}</span>
                        )}
                        {item.sellerName && (
                          <span className="text-[10px] text-indigo-600 font-medium block">Sold by: {item.sellerName}</span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-slate-500">{item.sku}</td>
                      <td className="p-3 text-right font-medium">{format(item.price)}</td>
                      <td className="p-3 text-center font-medium">{item.quantity}</td>
                      <td className="p-3 text-right font-semibold text-slate-900">{format(item.total)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-400">Order item breakdown recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Calculations Summary */}
          <div className="flex justify-end pt-2">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-medium text-slate-900">{format(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount Savings:</span>
                  <span>-{format(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Shipping Charges:</span>
                <span>{order.shippingFee === 0 ? 'FREE' : format(order.shippingFee)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Taxes & Marketplace GST:</span>
                <span>{format(order.tax)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between text-sm font-bold text-slate-900">
                <span>Grand Total:</span>
                <span className="text-indigo-600">{format(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="border-t border-slate-100 pt-4 text-center text-[11px] text-slate-400">
            Thank you for shopping on Commerce Engine! For support or returns, visit your account dashboard.
          </div>
        </div>
      </div>
    </div>
  );
}
