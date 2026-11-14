import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Camera, Lock } from "lucide-react";
import { CropModal } from "../../common/CropModal";
import { useAuthStore, assertOwnAuthAccount } from "../../../store/authStore";
import toast from "react-hot-toast";
import { supabase } from "../../../services/supabase";

export const EditProfileModal: React.FC<{ isOpen: boolean; onClose: () => void; initialTab?: 'profile' | 'password' }> = ({
  isOpen,
  onClose,
  initialTab = "profile",
}) => {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const updateUserMetadata = useAuthStore((state) => state.updateUserMetadata);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "password">(initialTab);
  const [passwords, setPasswords] = useState({ new: "", confirm: "" });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
  const [formData, setFormData] = useState({
    fullName: user?.user_metadata?.full_name || "",
  });
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setFormData({ fullName: profile?.name || user?.user_metadata?.full_name || "" });
      setAvatarUrl(profile?.avatar_url || null);
    }
  }, [isOpen, initialTab, user?.user_metadata?.full_name, profile?.name, profile?.avatar_url]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !cropImageSrc && !isSaving && !isUpdatingPassword) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, cropImageSrc, isSaving, isUpdatingPassword, onClose]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) return toast.error("Vui lòng chọn file ảnh");
    if (file.size > 5 * 1024 * 1024) return toast.error("Ảnh tối đa 5MB");

    const reader = new FileReader();
    reader.addEventListener("load", () => setCropImageSrc(reader.result?.toString() || null));
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCropSubmit = async (croppedBlob: Blob) => {
    if (!user) return;
    setCropImageSrc(null);
    setIsSaving(true);

    try {
      assertOwnAuthAccount();
      const path = `${user.id}/${Date.now()}.jpg`;
      const file = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" });

      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: "image/jpeg" });
      if (error) throw error;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      await updateUserMetadata({ avatar_url: data.publicUrl });
      setAvatarUrl(data.publicUrl);
      toast.success("Đã cập nhật ảnh đại diện");
    } catch (error: any) {
      toast.error(error.message || "Không thể tải ảnh lên");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (passwords.new.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }
    if (passwords.new !== passwords.confirm) {
      return toast.error("Passwords do not match");
    }

    if (user?.id === "dev-admin-id") {
      toast.success("Password updated (Offline Mode simulated)");
      setPasswords({ new: "", confirm: "" });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      assertOwnAuthAccount();
      const { error } = await supabase.auth.updateUser({ password: passwords.new });
      if (error) throw error;

      toast.success("Password updated successfully!");
      setPasswords({ new: "", confirm: "" });
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateUserMetadata({
        full_name: formData.fullName,
      });
      toast.success("Profile updated successfully!");
      onClose();
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || typeof document === "undefined") return null;

  return (
    <>
      {createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-settings-title"
          onClick={() => !isSaving && !isUpdatingPassword && onClose()}
          className="fixed inset-0 z-[10050] grid place-items-center p-3 sm:p-4 bg-slate-950/45 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div
            data-modal-surface="true"
            onClick={(e) => e.stopPropagation()}
            className="modal-liquid-glass w-full max-w-lg max-h-[90dvh] rounded-2xl border border-white/95 dark:border-slate-700/80 overflow-hidden grid grid-rows-[auto_auto_1fr_auto] animate-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200/75 dark:border-slate-800/80 grid grid-cols-[1fr_auto] items-center gap-3">
              <h2 id="account-settings-title" className="text-lg sm:text-xl font-bold tracking-tight text-[#002e6d] dark:text-white">
                Account Settings
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng"
                className="min-h-[36px] min-w-[36px] grid place-items-center hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Segmented Tab Bar: Light Mode brand #002e6d active tab, Dark Mode preserved */}
            <div className="grid grid-cols-2 border-b border-slate-200/75 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/40 px-4 pt-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                className={`py-2.5 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
                  activeTab === "profile"
                    ? "border-[#002e6d] text-[#002e6d] dark:border-sky-400 dark:text-sky-400"
                    : "border-transparent text-slate-500 hover:text-[#002e6d] dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Profile Info
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("password")}
                className={`py-2.5 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
                  activeTab === "password"
                    ? "border-[#002e6d] text-[#002e6d] dark:border-sky-400 dark:text-sky-400"
                    : "border-transparent text-slate-500 hover:text-[#002e6d] dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Security &amp; Password
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-6">
              {activeTab === "profile" ? (
                <>
                  <div className="grid justify-items-center gap-3">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#002e6d] to-[#1d5bb8] text-white grid place-items-center text-3xl font-bold shadow-md ring-4 ring-white/90 dark:ring-slate-800">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          formData.fullName
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .substring(0, 2)
                            .toUpperCase() || "U"
                        )}
                      </div>
                      <div className="absolute inset-0 bg-slate-950/45 rounded-full grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={24} className="text-white" />
                      </div>
                    </div>

                    <div className="inline-grid grid-flow-col auto-cols-max items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-1.5 text-xs font-semibold text-[#002e6d] bg-blue-50/90 hover:bg-blue-100/90 border border-blue-200/70 dark:border-blue-500/20 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 dark:text-sky-400 rounded-lg transition-colors cursor-pointer"
                      >
                        Đổi ảnh
                      </button>
                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm("Bạn có chắc muốn xoá ảnh đại diện?")) return;
                            setIsSaving(true);
                            try {
                              await updateUserMetadata({ avatar_url: null });
                              setAvatarUrl("");
                              toast.success("Đã xoá ảnh đại diện");
                            } catch {
                              toast.error("Có lỗi xảy ra khi xoá ảnh");
                            } finally {
                              setIsSaving(false);
                            }
                          }}
                          className="px-3.5 py-1.5 text-xs font-semibold text-red-600 bg-red-50/90 hover:bg-red-100 border border-red-200/70 dark:border-red-500/20 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 rounded-lg transition-colors cursor-pointer"
                        >
                          Xoá ảnh
                        </button>
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white/95 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#002e6d]/20 focus:border-[#002e6d] outline-none transition-all shadow-2xs"
                      />
                    </div>

                    <div className="pt-3 border-t border-slate-200/75 dark:border-slate-800/80 space-y-3.5">
                      <div>
                        <label className="inline-grid grid-flow-col auto-cols-max items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                          <Lock size={12} /> Email (Read-only)
                        </label>
                        <input
                          type="text"
                          value={user?.email || "Chưa cập nhật"}
                          disabled
                          className="w-full px-4 py-2.5 bg-slate-100/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="inline-grid grid-flow-col auto-cols-max items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                          <Lock size={12} /> Department (Read-only)
                        </label>
                        <input
                          type="text"
                          value={profile?.department_name || "Chưa phân team"}
                          disabled
                          className="w-full px-4 py-2.5 bg-slate-100/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="inline-grid grid-flow-col auto-cols-max items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                          <Lock size={12} /> Job title &amp; level (Read-only)
                        </label>
                        <input
                          type="text"
                          value={[profile?.job_title, profile?.employment_level].filter(Boolean).join(" · ") || "Chưa cập nhật"}
                          disabled
                          className="w-full px-4 py-2.5 bg-slate-100/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwords.new}
                      onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                      placeholder="At least 6 characters"
                      className="w-full px-4 py-2.5 bg-white/95 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#002e6d]/20 focus:border-[#002e6d] outline-none transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                      placeholder="Repeat new password"
                      className="w-full px-4 py-2.5 bg-white/95 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#002e6d]/20 focus:border-[#002e6d] outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div className="p-4 bg-amber-50/90 dark:bg-yellow-900/20 border border-amber-200/80 dark:border-yellow-900/50 rounded-xl mt-4">
                    <h4 className="text-sm font-bold text-amber-800 dark:text-yellow-500 mb-1">Important Notice</h4>
                    <p className="text-xs text-amber-700 dark:text-yellow-600">
                      Changing your password will immediately secure your account. Make sure to use a strong password.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-200/75 dark:border-slate-800/80 bg-white/75 dark:bg-slate-900/60 grid grid-flow-col auto-cols-max justify-end items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white/90 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              {activeTab === "profile" ? (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="btn-add-new px-5 py-2 text-sm font-semibold text-white rounded-xl transition-colors shadow-sm disabled:opacity-50 inline-grid grid-flow-col auto-cols-max items-center gap-2 cursor-pointer"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleUpdatePassword}
                  disabled={isUpdatingPassword || !passwords.new}
                  className="btn-add-new px-5 py-2 text-sm font-semibold text-white rounded-xl transition-colors shadow-sm disabled:opacity-50 inline-grid grid-flow-col auto-cols-max items-center gap-2 cursor-pointer"
                >
                  {isUpdatingPassword ? "Updating..." : "Update Password"}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
      {cropImageSrc && (
        <CropModal
          imageSrc={cropImageSrc}
          onClose={() => setCropImageSrc(null)}
          onCropComplete={handleCropSubmit}
        />
      )}
    </>
  );
};
