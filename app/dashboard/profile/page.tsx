import { ProfileContent } from "@/components/dashboard";

// This would come from your auth system in a real app
async function getProfile() {
  const profile = {
    name: "Admin User",
    email: "admin@example.com",
    avatar: "",
  };

  return profile;
}

export default async function ProfilePage() {
  const profile = await getProfile();

  return <ProfileContent initialProfile={profile} />;
}
