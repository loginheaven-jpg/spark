import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AdminDashboard from "./pages/AdminDashboard";
import OrganizerPage from "./pages/OrganizerPage";
import MyEvents from "./pages/MyEvents";
import ProfilePage from "./pages/ProfilePage";
import EventDetailPage from "./pages/EventDetailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/admin"} component={AdminDashboard} />
      <Route path={"/organizer"} component={OrganizerPage} />
      <Route path={"/my-events"} component={MyEvents} />
      <Route path={"/profile"} component={ProfilePage} />
      <Route path={"/event/:id"} component={EventDetailPage} />
      <Route path={"/forgot-password"} component={ForgotPasswordPage} />
      <Route path={"/reset-password"} component={ResetPasswordPage} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
