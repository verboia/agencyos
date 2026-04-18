import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <Card>
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-lg bg-adria flex items-center justify-center text-white font-bold text-xl">
          A
        </div>
        <CardTitle className="text-2xl">AgencyOS</CardTitle>
        <CardDescription>Entre com sua conta Adria</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
