import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Admin sign in · Norway POI Map",
};

export default function AdminLoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <LoginForm />
    </div>
  );
}
