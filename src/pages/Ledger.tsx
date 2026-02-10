import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DTHLedger from "./DTHLedger";
import MobileRechargeLedger from "./MobileRechargeLedger";
import SettlementLedger from "./SettlementLedger";
import PostpaidMobileRechargeLedger from "./PostPaidMobileRechargeLedger";

interface TokenData {
  user_id: string;
  user_name: string;
  exp: number;
}

export default function UserLedger() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [activeTab, setActiveTab] = useState("dth");

  // Decode token
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast({
        title: "Authentication required",
        description: "Please login to continue.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    try {
      const decoded: TokenData = jwtDecode(token);
      if (!decoded?.exp || decoded.exp * 1000 < Date.now()) {
        toast({
          title: "Session expired",
          description: "Login again.",
          variant: "destructive",
        });
        localStorage.removeItem("authToken");
        navigate("/login");
        return;
      }
      setTokenData(decoded);
    } catch (error) {
      toast({
        title: "Invalid token",
        description: "Please login.",
        variant: "destructive",
      });
      navigate("/login");
    }
  }, [navigate, toast]);

  if (!tokenData) {
    return (
      <div className="flex min-h-screen w-full bg-gray-50">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-gray-50">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Header Section */}
          <div className="paybazaar-gradient rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">User Ledger</h1>
                <p className="text-white/90 text-sm mt-1">
                  View and manage your transaction history across all services
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-lg grid-cols-4">
              <TabsTrigger value="dth">DTH Recharge</TabsTrigger>
              <TabsTrigger value="mobile">Mobile Recharge</TabsTrigger>
              <TabsTrigger value="settlement">Settlement</TabsTrigger>
              <TabsTrigger value="postpaid">Postpaid Recharge</TabsTrigger>
            </TabsList>

            <TabsContent value="dth">
              <DTHLedger userId={tokenData.user_id} />
            </TabsContent>

            <TabsContent value="mobile">
              <MobileRechargeLedger userId={tokenData.user_id} />
            </TabsContent>

            <TabsContent value="settlement">
              <SettlementLedger userId={tokenData.user_id} />
            </TabsContent>
            
            <TabsContent value="postpaid">
              <PostpaidMobileRechargeLedger userId={tokenData.user_id} />
            </TabsContent>

          </Tabs>
        </main>
      </div>
    </div>
  );
}