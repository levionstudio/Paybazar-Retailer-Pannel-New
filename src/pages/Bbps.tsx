import { useState } from "react";
import { Search, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Satellite,
  Smartphone,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";

const utilityServices = [
  {
    id: 1,
    name: "Electricity",
    icon: Satellite,
    totalBillers: 11,
    category: "Electricity",
    color: "from-slate-500 to-slate-600",
    route: "/electricity",
  },
  {
    id: 2,
    name: "Mobile (Postpaid)",
    icon: Smartphone,
    totalBillers: 8,
    category: "Mobile",
    color: "from-cyan-500 to-cyan-600",
    route: "/mobilerechargepostpaid",
  },
];

const categories = [
  "All",
  "Mobile",
  "Electricity",
];

export default function BBPSPayments() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredServices = utilityServices.filter((service) => {
    const matchesSearch = service.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleServiceClick = (service: (typeof utilityServices)[0]) => {
    
    // Navigate to the service route
    if (service.route) {
      navigate(service.route);
    } else {
      // If no route is defined, show a toast or message
    }
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        
        {/* Header and Search Section */}
        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Title with Back Button */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/services")}
                className="text-primary-foreground hover:bg-white/10 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5 text-primary" />
              </Button>
              <h1 className="text-2xl font-semibold text-primary">
                Mobile & Electricity Recharge
              </h1>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5 z-10" />
              <Input
                placeholder="Search utilities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 bg-background/95 backdrop-blur-sm border border-border text-foreground placeholder:text-muted-foreground rounded-lg shadow-sm"
              />
            </div>

            {/* Category Filter Pills - Directly below search */}
            <div className="flex flex-wrap gap-3">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 hover:scale-105"
                >
                  {category}
                </Button>
              ))}
            </div>

            {/* Service Cards - Below category filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-6 gap-4 pt-2">
              {filteredServices.slice(0, 54).map((service) => {
                const IconComponent = service.icon;
                return (
                  <Card
                    key={service.id}
                    className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-paybazaar-glow bg-card border border-border rounded-lg overflow-hidden"
                    onClick={() => handleServiceClick(service)}
                  >
                    <CardContent className="p-4 h-36 flex flex-col items-center justify-center text-center space-y-3">
                      {/* Icon with Brand Colors */}
                      <div className="p-3 rounded-lg bg-gradient-light group-hover:bg-gradient-primary transition-all duration-300">
                        <IconComponent className="h-6 w-6 text-paybazaar-navy group-hover:text-primary-foreground transition-colors duration-300" />
                      </div>

                      {/* Service Info */}
                      <div className="space-y-1">
                        <h3 className="font-semibold text-xs text-foreground leading-tight line-clamp-2">
                          {service.name}
                        </h3>
                        <Badge
                          variant="secondary"
                          className="text-xs rounded-full"
                        >
                          {service.totalBillers.toLocaleString()}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Enhanced No Results */}
            {filteredServices.length === 0 && (
              <div className="text-center py-20">
                <div className="bg-gradient-light rounded-2xl p-12 max-w-md mx-auto shadow-paybazaar-card">
                  <Search className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
                  <h3 className="text-xl font-bold text-foreground mb-3">
                    No services found
                  </h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search terms or category filter
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}