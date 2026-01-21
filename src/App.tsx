import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import ProfileUpdate from "./pages/ProfileUpdate";
import Services from "./pages/Services";
import UtilityPayments from "./pages/UtilityServices";
import AePS from "./pages/Aeps";
import AepsKyc from "./pages/Aeps2";
import DigiKatha from "./pages/Digikhata";
import Dmt1 from "./pages/Dmt1";
import Dmt2 from "./pages/Dmt2";
import ChangePassword from "./pages/ChangePassword";
import ContactUs from "./pages/ContactUs";
import MyCommission from "./pages/Commission";
import RequestFunds from "./pages/fundRequest";
import GetFundRequests from "./pages/requestedFund";
import UserWalletTransactions from "./pages/accounthistory";
import Settlement from "./pages/settlement";
import UserPayouts from "./pages/Ledger";
import ReceiptPage from "./pages/Receipt";
import { Settings } from "lucide-react";
import ChangePasswordMpin from "./pages/settings";
import ServicesReport from "./pages/ServiceReport";
import ServiceReportSettlement from "./pages/ServiceReportSettlement";
import MyDocuments from "./pages/Documents";
import MyTickets from "./pages/Tickets";
import TDSCommissionPage from "./pages/Tds";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="paybazaar-ui-theme">
      <TooltipProvider>
        <SidebarProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/funds-request" element={<RequestFunds/>} />
              <Route path="/profile/update" element={<ProfileUpdate />} />
              <Route path="/services" element={<Services />} />
              <Route path="/service/report" element={ <ServicesReport />} />
              <Route path="/service/settlement/report" element={ <ServiceReportSettlement />} />
               <Route path="/tickets" element={<MyTickets />} />
              <Route path="/documents" element={<MyDocuments />} />
              <Route path="/utility-payments" element={<UtilityPayments />} />
              <Route path="/aeps" element={<AePS />} />
              <Route path="/aeps2" element={<AepsKyc />} />
              <Route path="/digikatha" element={<DigiKatha />} />
              <Route path="/dmt1" element={<Dmt1 />} />
              <Route path="/dmt2" element={<Dmt2 />} />
              <Route path="/change-password" element={<ChangePassword />} />
              <Route path="/contact-us" element={<ContactUs />} />
              <Route path="/commission" element={<MyCommission />} />
              <Route path="/funds" element={<GetFundRequests />} />
              <Route path="/transactions" element={<UserWalletTransactions />} />
              <Route path="/settlement" element={<Settlement />} />
              <Route path="/reports" element={<UserPayouts />} />
              <Route path="/receipt/:transactionId" element={<ReceiptPage />} />
              <Route path="/tds-commissions" element={<TDSCommissionPage />} />

              <Route path="/settings" element={<ChangePasswordMpin />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </SidebarProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
