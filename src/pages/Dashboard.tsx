import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { Header } from "@/components/layout/Header";
import { ServiceCard } from "@/components/dashboard/ServiceCard";
import { StatsCard } from "@/components/dashboard/StatsCard";
import {
  ArrowLeftRight,
  Smartphone,
  Shield,
  Wallet,
  Landmark,
  Building2,
  Loader2,
} from "lucide-react";
import { TransactionsTable } from "@/components/dashboard/TransactionTable";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useToast } from "@/hooks/use-toast";

/* -------------------- TOKEN INTERFACE -------------------- */
interface DecodedToken {
  user_id: string;
  user_name: string;
  user_role: string;
  exp: number;
  iat: number;
}

/* -------------------- USER INFO -------------------- */
interface UserInfo {
  id: string;
  name: string;
  role: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /* -------------------- TOKEN VALIDATION -------------------- */
  useEffect(() => {
    const validateToken = () => {
      const token = localStorage.getItem("authToken");

      if (!token) {
        toast({
          title: "Session expired",
          description: "Please login again.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      try {
        const decoded = jwtDecode<DecodedToken>(token);

        // Check if token is expired
        if (decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem("authToken");
          toast({
            title: "Session expired",
            description: "Your session has expired. Please login again.",
            variant: "destructive",
          });
          navigate("/login");
          return;
        }

        // Check if user role is retailer
        if (decoded.user_role !== "retailer") {
          localStorage.removeItem("authToken");
          toast({
            title: "Access Denied",
            description: "You don't have permission to access this page.",
            variant: "destructive",
          });
          navigate("/login");
          return;
        }

        // Set user info
        setUserInfo({
          id: decoded.user_id,
          name: decoded.user_name,
          role: decoded.user_role,
        });

        setIsLoading(false);
      } catch (error) {
        console.error("Token decode error:", error);
        localStorage.removeItem("authToken");
        toast({
          title: "Invalid session",
          description: "Please login again.",
          variant: "destructive",
        });
        navigate("/login");
      }
    };

    validateToken();
  }, [navigate, toast]);

  /* -------------------- SERVICES -------------------- */
  const services = [
    {
      title: "Money Transfer",
      icon: ArrowLeftRight,
      status: "active" as const,
      description: "Send money instantly to any bank account",
      stats: [{ label: "Today", value: "₹0.00" }],
    },
    {
      title: "Mobile Recharge",
      icon: Smartphone,
      status: "active" as const,
      description: "Recharge prepaid mobiles and DTH connections",
      stats: [{ label: "Today", value: "₹0.00" }],
    },
    {
      title: "AePS",
      icon: Shield,
      status: "active" as const,
      description: "Aadhaar Enabled Payment Services",
      stats: [{ label: "Today", value: "₹0.00" }],
    },
    {
      title: "BBPS",
      icon: Wallet,
      status: "active" as const,
      description: "Pay electricity, water, gas and other bills",
      stats: [{ label: "Today", value: "₹0.00" }],
    },
    {
      title: "Ticket Booking",
      icon: Building2,
      status: "active" as const,
      description: "Book flight and bus tickets",
      stats: [{ label: "Today", value: "₹0.00" }],
    },
    {
      title: "UPI",
      icon: Landmark,
      status: "active" as const,
      description: "Universal Payment Interface",
      stats: [{ label: "Today", value: "₹0.00" }],
    },
  ];

  /* -------------------- LOADING STATE -------------------- */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  /* -------------------- MAIN UI -------------------- */
  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header userInfo={userInfo} />

        <main className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Welcome */}
          <div className="paybazaar-gradient rounded-lg p-6 text-white">
            <h1 className="text-2xl font-bold mb-2">
              Welcome back, {userInfo?.name || "User"}!
            </h1>
            <p className="text-white/90">
              Here's your business overview for today. You've processed ₹0 in
              transactions.
            </p>
          
          </div>

          {/* Services */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Your Services</h2>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
              {services.map((service, index) => (
                <ServiceCard
                  key={index}
                  {...service}
                  onManage={() => console.log(`Managing ${service.title}`)}
                />
              ))}
            </div>
          </div>

          <TransactionsTable userId={userInfo?.id} />
        </main>
      </div>
    </div>
  );
}