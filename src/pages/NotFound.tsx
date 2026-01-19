import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Clock } from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.log(
      "User attempted to access route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header  />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-2xl mx-auto text-center">
            {/* Coming Soon Animation */}
            <div className="relative mb-8">
              <div className="flex items-center justify-center mb-4">
                <Clock className="h-24 w-24 text-primary/20 animate-pulse" />
              </div>
              <h1 className="text-6xl md:text-8xl pb-4 font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60 animate-fade-in leading-none">
                Coming Soon
              </h1>
            </div>

            {/* Content */}
            <div className="space-y-6 animate-fade-in delay-300">
              <div className="space-y-3">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                  This Page is Under Development
                </h2>
                <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
                  We're working hard to bring you this feature. Please check back soon!
                </p>
              </div>

              {/* Current path display
              <div className="bg-muted/50 backdrop-blur-sm border border-border rounded-lg p-4 mx-auto max-w-md">
                <p className="text-sm text-muted-foreground mb-1">Page:</p>
                <code className="text-primary text-sm font-mono bg-background px-2 py-1 rounded">
                  {location.pathname}
                </code>
              </div> */}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="paybazaar-gradient text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg min-w-[180px]"
                >
                  <Home className="w-5 h-5 mr-2" />
                  Go to Dashboard
                </Button>

                <Button
                  onClick={() => navigate(-1)}
                  variant="outline"
                  className="px-8 py-3 rounded-xl font-semibold transition-all duration-300 min-w-[180px]"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Go Back
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
