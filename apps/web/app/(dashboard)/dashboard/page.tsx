"use client";

import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  CheckCircle2,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const statCards = [
  {
    title: "Total Revenue",
    value: "$0.00",
    change: "+0%",
    trend: "up",
    description: "No invoices yet",
    icon: DollarSign,
    color: "text-emerald-500",
  },
  {
    title: "Invoices Sent",
    value: "0",
    change: "+0%",
    trend: "neutral",
    description: "Create your first invoice",
    icon: FileText,
    color: "text-blue-500",
  },
  {
    title: "Paid Invoices",
    value: "0",
    change: "0%",
    trend: "neutral",
    description: "0% payment rate",
    icon: CheckCircle2,
    color: "text-green-500",
  },
  {
    title: "Active Customers",
    value: "0",
    change: "+0%",
    trend: "neutral",
    description: "Add your first customer",
    icon: Users,
    color: "text-purple-500",
  },
];

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, {user?.name}!
          </p>
        </div>
        <Button onClick={logout} variant="outline" size="sm">
          Sign out
        </Button>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon =
            stat.trend === "up"
              ? TrendingUp
              : stat.trend === "down"
                ? TrendingDown
                : null;

          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg bg-accent/50 ${stat.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {TrendIcon && (
                      <TrendIcon
                        className={`h-3 w-3 ${stat.trend === "up" ? "text-emerald-500" : "text-red-500"}`}
                      />
                    )}
                    <p
                      className={`text-xs ${stat.trend === "up" ? "text-emerald-500" : stat.trend === "down" ? "text-red-500" : "text-muted-foreground"}`}
                    >
                      {stat.change}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      from last month
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Getting Started Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Follow these steps to start invoicing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-lg border border-border bg-accent/30 hover:bg-accent/50 transition-colors">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-primary">1</span>
              </div>
              <div className="flex-1">
                <h3 className="font-medium mb-1">Add your first customer</h3>
                <p className="text-sm text-muted-foreground">
                  Start by adding customer information to create invoices
                  faster.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg border border-border bg-accent/30 hover:bg-accent/50 transition-colors">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-primary">2</span>
              </div>
              <div className="flex-1">
                <h3 className="font-medium mb-1">Create your first invoice</h3>
                <p className="text-sm text-muted-foreground">
                  Design beautiful invoices with your branding and send them to
                  clients.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg border border-border bg-accent/30 hover:bg-accent/50 transition-colors">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-primary">3</span>
              </div>
              <div className="flex-1">
                <h3 className="font-medium mb-1">Get paid</h3>
                <p className="text-sm text-muted-foreground">
                  Receive payments online via Stripe or PayPal with automated
                  reminders.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
