import { AccountBookOutlined } from "@ant-design/icons";
import type { HmsModule } from "../../app/moduleRegistry";
import BillsPage from "./BillsPage";
import NewBillForm from "./NewBillForm";
import ReceiptPrintView from "./ReceiptPrintView";

/** Core, always-on - registered in registerCore.ts, not the remote/plugin
 * loader. Billing is not a toggleable department package (see the roadmap's
 * architecture diagram: "Billing Engine (core ledger)" lives inside the
 * always-on CORE PLATFORM box), so unlike opd/lab/pharmacy/appointments
 * there is no enable/disable and no PatientsPage xEnabled guard. */
export const billingModule: HmsModule = {
  id: "billing",
  title: "Billing",
  icon: <AccountBookOutlined />,
  order: 5,
  routes: [
    { path: "billing", element: <BillsPage /> },
    { path: "billing/new", element: <NewBillForm /> },
    { path: "billing/bills/:billId/print", element: <ReceiptPrintView /> },
  ],
  menu: [{ path: "/billing", label: "Billing" }],
};
