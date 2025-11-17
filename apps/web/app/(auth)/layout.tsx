export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-background to-accent/5 px-4 sm:px-6 lg:px-8 py-12">
      <div className="w-full max-w-[440px]">{children}</div>
    </div>
  );
}
