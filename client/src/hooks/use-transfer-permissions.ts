import { useAuth } from "@/components/auth-gate";

/** Keep local/offline mode working; authenticated users use resolved permissions. */
export function useTransferPermissions() {
  const { user, authEnabled } = useAuth();
  return {
    canExport: !authEnabled ||
      (user?.role === "admin" || user?.permissions?.export === true),
    canImportTemplates: !authEnabled ||
      (user?.role === "admin" || user?.permissions?.import_templates === true),
  };
}
