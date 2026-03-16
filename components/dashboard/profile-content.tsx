"use client";

import * as React from "react";
import { PageHeader } from "@/components/dashboard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Lock,
  Bell,
  Shield,
  Camera,
  Save,
} from "lucide-react";

interface ProfileData {
  name: string;
  email: string;
  avatar?: string;
}

interface ProfileContentProps {
  initialProfile: ProfileData;
  onSaveProfile?: (profile: ProfileData) => Promise<void>;
  onChangePassword?: (passwords: { current: string; new: string }) => Promise<void>;
}

export function ProfileContent({
  initialProfile,
  onSaveProfile,
  onChangePassword,
}: ProfileContentProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const [profile, setProfile] = React.useState(initialProfile);

  const [passwords, setPasswords] = React.useState({
    current: "",
    new: "",
    confirm: "",
  });

  const [notifications, setNotifications] = React.useState({
    email: true,
    push: false,
    marketing: false,
    security: true,
  });

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      await onSaveProfile?.(profile);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setIsLoading(true);
    try {
      await onChangePassword?.({ current: passwords.current, new: passwords.new });
      setPasswords({ current: "", new: "", confirm: "" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Profile"
        description="Manage your account settings and preferences."
        dateRangeOptions={[]}
      />

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-6 bg-secondary border border-border">
          <TabsTrigger value="general" className="gap-2">
            <User className="h-4 w-4" strokeWidth={1.5} />
            General
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="h-4 w-4" strokeWidth={1.5} />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" strokeWidth={1.5} />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-1">Profile Information</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Update your personal details and profile picture.
            </p>

            <div className="flex items-center gap-6 mb-8">
              <Avatar className="h-20 w-20 border-2 border-border">
                <AvatarImage src={profile.avatar} alt={profile.name} />
                <AvatarFallback className="text-lg bg-secondary">
                  {profile.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Camera className="h-4 w-4" strokeWidth={1.5} />
                  Change Photo
                </Button>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG or GIF. Max 2MB.
                </p>
              </div>
            </div>

            <Separator className="mb-6" />

            <div className="grid gap-6 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="pl-10"
                    placeholder="Your name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="pl-10"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={isLoading}
                className="w-fit gap-2"
              >
                <Save className="h-4 w-4" strokeWidth={1.5} />
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-1">Change Password</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Update your password to keep your account secure.
            </p>

            <div className="grid gap-6 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    id="current-password"
                    type="password"
                    value={passwords.current}
                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                    className="pl-10"
                    placeholder="Enter current password"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    id="new-password"
                    type="password"
                    value={passwords.new}
                    onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                    className="pl-10"
                    placeholder="Enter new password"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    id="confirm-password"
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                    className="pl-10"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={isLoading || !passwords.current || !passwords.new || passwords.new !== passwords.confirm}
                className="w-fit gap-2"
              >
                <Shield className="h-4 w-4" strokeWidth={1.5} />
                {isLoading ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-medium mb-1">Two-Factor Authentication</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Add an extra layer of security to your account.
            </p>

            <div className="flex items-center justify-between max-w-md">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Enable 2FA</p>
                <p className="text-xs text-muted-foreground">
                  Require a verification code when signing in.
                </p>
              </div>
              <Switch />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-1">Notification Preferences</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Choose how you want to be notified.
            </p>

            <div className="space-y-6 max-w-md">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Receive notifications via email.
                  </p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, email: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Receive push notifications in your browser.
                  </p>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, push: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Marketing Emails</p>
                  <p className="text-xs text-muted-foreground">
                    Receive updates about new features and tips.
                  </p>
                </div>
                <Switch
                  checked={notifications.marketing}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, marketing: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Security Alerts</p>
                  <p className="text-xs text-muted-foreground">
                    Get notified about security events.
                  </p>
                </div>
                <Switch
                  checked={notifications.security}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, security: checked })
                  }
                />
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
