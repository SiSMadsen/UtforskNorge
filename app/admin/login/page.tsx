import { Suspense } from "react";

import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Admin sign in · Norway POI Map",
};

export default function AdminLoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
