import React from 'react';
import { OrderPdfPrintModule } from '../../modules/orderPdfPrint';
import { OrderPdfBatchPrintViewProps } from '../../modules/orderPdfPrint/types';

/**
 * Re-export OrderPdfPrintModule as OrderPdfBatchPrintView for backward compatibility.
 * All logic and components are modularized under src/modules/orderPdfPrint/
 */
export const OrderPdfBatchPrintView: React.FC<OrderPdfBatchPrintViewProps> = (props) => {
  return <OrderPdfPrintModule {...props} />;
};

export default OrderPdfBatchPrintView;
