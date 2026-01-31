import { useState } from "react";
import { Search, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Wifi,
  Users,
  Heart,
  GraduationCap,
  Zap,
  Fuel,
  Building2,
  Shield,
  CreditCard,
  Smartphone,
  PiggyBank,
  RotateCcw,
  Monitor,
  Tv,
  Satellite,
  Lightbulb,
  Tag,
  Droplets,
  Phone,
  Building,
  MapPin,
  Receipt,
  Home,
  Banknote,
  Printer,
  Eye,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";

// Sample transaction data
// const recentTransactions = [
//   {
//     refId: "TXN001234567",
//     category: "Electricity",
//     billerName: "MSEB Maharashtra",
//     amount: "₹2,450",
//     customerName: "Rajesh Kumar",
//     status: "Success",
//     date: "2024-01-15",
//   },
//   {
//     refId: "TXN001234568",
//     category: "Mobile Prepaid",
//     billerName: "Airtel Prepaid",
//     amount: "₹399",
//     customerName: "Priya Sharma",
//     status: "Success",
//     date: "2024-01-15",
//   },
//   {
//     refId: "TXN001234569",
//     category: "DTH",
//     billerName: "Tata Sky",
//     amount: "₹650",
//     customerName: "Amit Patel",
//     status: "Pending",
//     date: "2024-01-15",
//   },
//   {
//     refId: "TXN001234570",
//     category: "Water",
//     billerName: "Municipal Corporation",
//     amount: "₹1,200",
//     customerName: "Sunita Verma",
//     status: "Failed",
//     date: "2024-01-14",
//   },
//   {
//     refId: "TXN001234571",
//     category: "Credit Card",
//     billerName: "HDFC Bank",
//     amount: "₹5,000",
//     customerName: "Vikash Singh",
//     status: "Success",
//     date: "2024-01-14",
//   },
// ];

const utilityServices = [
  // {
  //   id: 1,
  //   name: "Broadband",
  //   icon: Wifi,
  //   totalBillers: 365,
  //   category: "Internet & TV",
  //   color: "from-blue-500 to-blue-600",
  //   route: "/broadband",
  // },
  // {
  //   id: 2,
  //   name: "Cable TV",
  //   icon: Tv,
  //   totalBillers: 56,
  //   category: "Internet & TV",
  //   color: "from-purple-500 to-purple-600",
  //   route: "/cable-tv",
  // },
  // {
  //   id: 3,
  //   name: "Credit Card",
  //   icon: CreditCard,
  //   totalBillers: 30,
  //   category: "Financial",
  //   color: "from-indigo-500 to-indigo-600",
  //   route: "/credit-card",
  // },
  // {
  //   id: 4,
  //   name: "Donation",
  //   icon: Heart,
  //   totalBillers: 68,
  //   category: "Charity",
  //   color: "from-red-500 to-red-600",
  //   route: "/donation",
  // },
  {
    id: 5,
    name: "DTH",
    icon: Satellite,
    totalBillers: 11,
    category: "Internet & TV",
    color: "from-slate-500 to-slate-600",
    route: "/dthrecharge",
  },
  // {
  //   id: 6,
  //   name: "Education Fee",
  //   icon: GraduationCap,
  //   totalBillers: 38995,
  //   category: "Education",
  //   color: "from-green-500 to-green-600",
  //   route: "/education-fee",
  // },
  // {
  //   id: 7,
  //   name: "Clubs & Associations",
  //   icon: Users,
  //   totalBillers: 26,
  //   category: "Lifestyle",
  //   color: "from-purple-500 to-purple-600",
  //   route: "/clubs-associations",
  // },
  // {
  //   id: 8,
  //   name: "Electricity",
  //   icon: Lightbulb,
  //   totalBillers: 116,
  //   category: "Utilities",
  //   color: "from-yellow-500 to-yellow-600",
  //   route: "/electricity",
  // },
  // {
    // id: 9,
    // name: "Electricity (Prepaid)",
    // icon: Zap,
    // totalBillers: 7,
    // category: "Utilities",
    // color: "from-yellow-400 to-yellow-500",
    // route: "/electricity-prepaid",
  // },
  // {
  //   id: 10,
  //   name: "FASTag Recharge",
  //   icon: Tag,
  //   totalBillers: 27,
  //   category: "Transport",
  //   color: "from-blue-500 to-blue-600",
  //   route: "/fastag-recharge",
  // },
  // {
  //   id: 11,
  //   name: "Gas (LPG Cylinder)",
  //   icon: Fuel,
  //   totalBillers: 4,
  //   category: "Utilities",
  //   color: "from-orange-500 to-orange-600",
  //   route: "/gas-lpg",
  // },
  // {
  //   id: 12,
  //   name: "Gas (PNG)",
  //   icon: Fuel,
  //   totalBillers: 38,
  //   category: "Utilities",
  //   color: "from-orange-600 to-orange-700",
  //   route: "/gas-png",
  // },
  // {
  //   id: 13,
  //   name: "Hospitals & Pathology",
  //   icon: Building2,
  //   totalBillers: 24,
  //   category: "Healthcare",
  //   color: "from-teal-500 to-teal-600",
  //   route: "/hospitals-pathology",
  // },
  // {
  //   id: 14,
  //   name: "Housing Society",
  //   icon: Building,
  //   totalBillers: 286,
  //   category: "Housing",
  //   color: "from-gray-500 to-gray-600",
  //   route: "/housing-society",
  // },
  // {
  //   id: 15,
  //   name: "Insurance",
  //   icon: Shield,
  //   totalBillers: 74,
  //   category: "Insurance",
  //   color: "from-indigo-500 to-indigo-600",
  //   route: "/insurance",
  // },
  // {
  //   id: 16,
  //   name: "Landline",
  //   icon: Phone,
  //   totalBillers: 10,
  //   category: "Communication",
  //   color: "from-gray-500 to-gray-600",
  //   route: "/landline",
  // },
  // {
  //   id: 17,
  //   name: "Loan EMI",
  //   icon: Banknote,
  //   totalBillers: 450,
  //   category: "Financial",
  //   color: "from-green-500 to-green-600",
  //   route: "/loan-emi",
  // },
  // {
  //   id: 18,
  //   name: "Mobile (Postpaid)",
  //   icon: Smartphone,
  //   totalBillers: 14,
  //   category: "Mobile",
  //   color: "from-blue-500 to-blue-600",
  //   route: "/mobile-postpaid",
  // },
  {
    id: 19,
    name: "Mobile (Prepaid)",
    icon: Smartphone,
    totalBillers: 8,
    category: "Mobile",
    color: "from-cyan-500 to-cyan-600",
    route: "/mobilerecharge", // This is the mobile recharge route
  },
  // {
  //   id: 20,
  //   name: "Municipal Taxes & Services",
  //   icon: MapPin,
  //   totalBillers: 94,
  //   category: "Government",
  //   color: "from-purple-500 to-purple-600",
  //   route: "/municipal-taxes",
  // },
  // {
  //   id: 21,
  //   name: "National Pension Scheme (NPS)",
  //   icon: PiggyBank,
  //   totalBillers: 1,
  //   category: "Financial",
  //   color: "from-emerald-500 to-emerald-600",
  //   route: "/nps",
  // },
  // {
  //   id: 22,
  //   name: "NCMC Recharge",
  //   icon: Receipt,
  //   totalBillers: 3,
  //   category: "Transport",
  //   color: "from-blue-400 to-blue-500",
  //   route: "/ncmc-recharge",
  // },
  // {
  //   id: 23,
  //   name: "Recurring Deposit",
  //   icon: RotateCcw,
  //   totalBillers: 46,
  //   category: "Financial",
  //   color: "from-violet-500 to-violet-600",
  //   route: "/recurring-deposit",
  // },
  // {
  //   id: 24,
  //   name: "Rental",
  //   icon: Home,
  //   totalBillers: 18,
  //   category: "Housing",
  //   color: "from-amber-500 to-amber-600",
  //   route: "/rental",
  // },
  // {
  //   id: 25,
  //   name: "Subscription",
  //   icon: Monitor,
  //   totalBillers: 37,
  //   category: "Entertainment",
  //   color: "from-indigo-500 to-indigo-600",
  //   route: "/subscription",
  // },
  // {
  //   id: 26,
  //   name: "Water",
  //   icon: Droplets,
  //   totalBillers: 70,
  //   category: "Utilities",
  //   color: "from-blue-400 to-blue-500",
  //   route: "/water",
  // },
];

const categories = [
  "All",
  "Utilities",
  "Financial",
  "Mobile",
  "Internet & TV",
  "Education",
  "Healthcare",
  "Transport",
  "Housing",
  "Government",
  "Entertainment",
  "Lifestyle",
  "Charity",
  "Insurance",
  "Communication",
];

export default function UtilityPayments() {
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
    console.log("Selected service:", service.name);
    
    // Navigate to the service route
    if (service.route) {
      navigate(service.route);
    } else {
      // If no route is defined, show a toast or message
      console.log(`Route not configured for ${service.name}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        {/* Modern Header */}
        <div className=" p-6 ">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/services")}
                className="text-primary-foreground hover:bg-white/10 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5 text-primary" />
              </Button>
              <h1 className="text-2xl font-semibold text-primary">
                Utility Payments
              </h1>
            </div>

            {/* Modern Search Bar */}
            <div className="relative max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5 z-10" />
              <Input
                placeholder="Search utilities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 bg-background/95 backdrop-blur-sm border border-border text-foreground placeholder:text-muted-foreground rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-3 mb-8">
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

          {/* Modern 9-Column Grid Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-6 gap-4 mb-8">
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

          {/* Professional Transactions Table */}
          {/* <div className="mt-12">
            <div className="bg-card rounded-lg shadow-paybazaar-card border border-border overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">
                  Recent Transactions
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted border-b border-border ">
                    <tr>
                      <th className="text-center p-4 font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                        Ref ID
                      </th>
                      <th className="text-center p-4 font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                        Category
                      </th>
                      <th className="text-center p-4 font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                        Biller Name
                      </th>
                      <th className="text-center p-4 font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="text-center p-4 font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="text-center p-4 font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-center p-4 font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentTransactions.map((transaction, index) => (
                      <tr
                        key={transaction.refId}
                        className={`hover:bg-muted/50 transition-colors ${
                          index % 2 === 0 ? "bg-background" : "bg-muted/20"
                        }`}
                      >
                        <td className="p-4 text-center text-sm font-mono text-foreground">
                          {transaction.refId}
                        </td>
                        <td className="p-4 text-sm text-center text-foreground">
                          {transaction.category}
                        </td>
                        <td className="p-4 text-sm text-center text-foreground">
                          {transaction.billerName}
                        </td>
                        <td className="p-4 text-sm  text-center font-semibold text-foreground">
                          {transaction.amount}
                        </td>
                        <td className="p-4 text-sm text-center text-foreground">
                          {transaction.customerName}
                        </td>
                        <td className="p-4">
                          <Badge
                            className={`w-24 h-7 flex text-center items-center justify-center text-xs rounded-full font-medium ${
                              transaction.status === "Success"
                                ? "bg-green-100 text-green-700 hover:bg-green-100"
                                : transaction.status === "Pending"
                                ? "bg-amber-100 text-amber-700 hover:bg-amber-100"
                                : "bg-red-100 text-red-700 hover:bg-red-100"
                            }`}
                          >
                            {transaction.status}
                          </Badge>
                        </td>

                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 rounded-full hover:bg-primary hover:text-primary-foreground"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 rounded-full hover:bg-primary hover:text-primary-foreground"
                            >
                              <Printer className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
}