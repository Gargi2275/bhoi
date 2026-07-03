import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

export function useFeatureAccess(featureCode: string, memberId?: number | string) {
  const [hasAccess, setHasAccess] = useState<boolean>(true);
  const [reason, setReason] = useState<string>("");
  const [upgradeMessage, setUpgradeMessage] = useState<string>("");
  const [used, setUsed] = useState<number>(0);
  const [limit, setLimit] = useState<number>(0);
  const [remaining, setRemaining] = useState<number>(0);
  const [unlimited, setUnlimited] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAccess = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.checkMemberFeatureLimit(featureCode, memberId);
      setHasAccess(res.has_access);
      setReason(res.reason || "");
      setUpgradeMessage(res.upgrade_message || "");
      setUsed(res.used || 0);
      setLimit(res.limit || 0);
      setRemaining(res.remaining || 0);
      setUnlimited(!!res.unlimited);
    } catch (err) {
      console.error(`Failed to check access for feature ${featureCode}`, err);
    } finally {
      setLoading(false);
    }
  }, [featureCode, memberId]);

  useEffect(() => {
    checkAccess();
    
    // Listen to subscription updates to trigger checkAccess refetch dynamically
    const handleSubscriptionUpdate = () => {
      checkAccess();
    };
    window.addEventListener("subscription-updated", handleSubscriptionUpdate);
    return () => {
      window.removeEventListener("subscription-updated", handleSubscriptionUpdate);
    };
  }, [checkAccess]);

  return {
    hasAccess,
    reason,
    upgradeMessage,
    used,
    limit,
    remaining,
    unlimited,
    loading,
    refetch: checkAccess
  };
}
