import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { MapPin, Users, ChevronRight, Loader2, UserPlus, Briefcase, Crown, TreePine, X, Network } from "lucide-react";
import { PageWrap } from "@/components/wag/PageWrap";
import { AnimatedCard, AvatarCircle } from "@/components/wag/primitives";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { motion } from "framer-motion";

export const Route = createFileRoute("/community-admin/families")({
  component: FamiliesPage,
});

/* ─── The Full Family Tree Visual ─── */
function FamilyTreeVisual({ family }: { family: any }) {
  const members = family.members || [];
  const father = members.find((m: any) => m.relation?.toLowerCase() === 'father');
  const mother = members.find((m: any) => m.relation?.toLowerCase() === 'mother');
  const siblings = members.filter((m: any) => ['brother', 'sister'].includes(m.relation?.toLowerCase()));

  return (
    <>
      <div className="text-center space-y-1">
        <h3 className="font-extrabold text-[#3E2723] text-lg flex items-center justify-center gap-1.5">
          <Network className="w-5 h-5 text-[#F97316]" /> Family Tree of {family.head}
        </h3>
        <p className="text-xs text-warm-muted">Genealogy and relationships within the samaj</p>
      </div>

      {/* Visual Family Tree Representation */}
      <div className="bg-white rounded-2xl p-5 border border-[#EBE3DB]/60 space-y-6 shadow-2xs relative overflow-hidden text-left">
        {/* Gen 1: Parents */}
        {(father || mother) && (
          <div className="flex justify-center gap-6 relative">
            {/* Connector Line to Children */}
            <div className="absolute bottom-[-16px] left-1/2 -translate-x-1/2 w-0.5 h-4 bg-[#EBE3DB]" />
            
            {father && (
              <div className="bg-[#FFF8F2] border border-[#EBE3DB] p-2.5 rounded-xl text-center w-28 shadow-2xs">
                <span className="text-[9px] font-bold text-[#F97316] bg-[#FDF2E9] px-2 py-0.5 rounded-full block w-max mx-auto mb-1">Father</span>
                <div className="text-[11px] font-bold text-[#3E2723] truncate">{father.name}</div>
                <div className="text-[8px] text-warm-muted truncate">{father.occupation || 'N/A'}</div>
              </div>
            )}

            {mother && (
              <div className="bg-[#FFF8F2] border border-[#EBE3DB] p-2.5 rounded-xl text-center w-28 shadow-2xs">
                <span className="text-[9px] font-bold text-[#F97316] bg-[#FDF2E9] px-2 py-0.5 rounded-full block w-max mx-auto mb-1">Mother</span>
                <div className="text-[11px] font-bold text-[#3E2723] truncate">{mother.name}</div>
                <div className="text-[8px] text-warm-muted truncate">{mother.occupation || 'N/A'}</div>
              </div>
            )}
          </div>
        )}

        {/* Gen 2: Self & Siblings */}
        <div className="pt-2 relative">
          {/* Horizontal Connector Line for siblings */}
          {((father || mother) && siblings.length > 0) && (
            <>
              <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-[#EBE3DB]" />
              <div className="absolute top-0 left-1/4 w-0.5 h-2 bg-[#EBE3DB]" />
              <div className="absolute top-0 right-1/4 w-0.5 h-2 bg-[#EBE3DB]" />
            </>
          )}
          
          <div className="flex justify-center gap-6 pt-2">
            <div className="bg-[#FAF3EC] border-2 border-[#F97316] p-2.5 rounded-xl text-center w-28 shadow-2xs relative">
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold text-white bg-[#F97316] px-1.5 py-0.5 rounded-full">Self</span>
              <div className="text-[11px] font-bold text-[#3E2723] truncate mt-1">{family.head}</div>
              <div className="text-[8px] text-warm-muted truncate">Head of Family</div>
            </div>

            {siblings.map((sib: any, idx: number) => (
              <div key={idx} className="bg-[#FFF8F2] border border-[#EBE3DB] p-2.5 rounded-xl text-center w-28 shadow-2xs">
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full block w-max mx-auto mb-1">{sib.relation}</span>
                <div className="text-[11px] font-bold text-[#3E2723] truncate">{sib.name}</div>
                <div className="text-[8px] text-warm-muted truncate">{sib.occupation || 'N/A'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════ */
function FamiliesPage() {
  const { user } = useAuth();
  const [families, setFamilies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<any | null>(null);

  const loadFamilies = async () => {
    setLoading(true);
    try {
      // Community admins: fetch by community ID
      const communityId = user?.communityId;
      let data: any[] = [];
      if (communityId) {
        data = await apiFetchFamilies(communityId);
      } else {
        data = await api.getMyFamilies();
      }
      setFamilies(data || []);
    } catch (e) {
      console.error("Failed to load families", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFamilies(); }, [user?.communityId]);

  const totalMembers = families.reduce((sum, f) => sum + (f.members?.length || 0), 0);

  return (
    <PageWrap
      title="Families"
      desc={`${families.length} family group${families.length !== 1 ? "s" : ""} in your samaj`}
    >
      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : families.length === 0 ? (
        <AnimatedCard className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-sand flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-warm-muted" />
          </div>
          <h3 className="font-ui font-semibold text-lg mb-2">No Families Registered</h3>
          <p className="text-warm-muted text-sm">
            Members can add their family groups from their member dashboard.
          </p>
        </AnimatedCard>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            <AnimatedCard className="p-5 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary to-primary/50" />
              <div className="text-3xl font-bold text-primary font-ui">{families.length}</div>
              <div className="text-xs text-warm-muted mt-1.5 uppercase tracking-wider font-semibold">Family Groups</div>
            </AnimatedCard>
            <AnimatedCard className="p-5 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal via-teal to-teal/50" />
              <div className="text-3xl font-bold text-teal font-ui">{totalMembers}</div>
              <div className="text-xs text-warm-muted mt-1.5 uppercase tracking-wider font-semibold">Total Members</div>
            </AnimatedCard>
            <AnimatedCard className="p-5 text-center col-span-2 sm:col-span-1 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold via-gold to-gold/50" />
              <div className="text-3xl font-bold text-gold font-ui">
                {totalMembers > 0 ? (totalMembers / families.length).toFixed(1) : "0"}
              </div>
              <div className="text-xs text-warm-muted mt-1.5 uppercase tracking-wider font-semibold">Avg per Family</div>
            </AnimatedCard>
          </div>

          {/* Family Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {families.map(f => (
              <AnimatedCard key={f.id} className="p-5 relative overflow-hidden">
                {/* Decorative leaf pattern */}
                <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-gradient-to-br from-emerald-50 to-transparent opacity-60" />
                
                <div className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <AvatarCircle name={f.head} size={44} />
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Crown className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-ui font-semibold text-sm">{f.head}</h3>
                        {f.village && (
                          <div className="text-[11px] text-warm-muted flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {f.village}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border border-emerald-200">
                      {f.members?.length || 0} members
                    </span>
                  </div>

                  {/* Mini tree preview */}
                  {f.members && f.members.length > 0 && (
                    <div className="flex items-center gap-1 mt-3 mb-3">
                      <div className="flex -space-x-2">
                        {f.members.slice(0, 4).map((m: any, i: number) => (
                          <div key={i} className="relative" style={{ zIndex: 4 - i }}>
                            <AvatarCircle name={m.name} size={30} />
                          </div>
                        ))}
                      </div>
                      {f.members.length > 4 && (
                        <div className="w-[30px] h-[30px] rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-500">
                          +{f.members.length - 4}
                        </div>
                      )}
                      <div className="flex-1 flex items-center gap-1 ml-2">
                        <div className="h-px flex-1 bg-gradient-to-r from-emerald-200 to-transparent" />
                        <TreePine className="w-3 h-3 text-emerald-300" />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setOpen(f)}
                    className="mt-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-50 to-amber-50 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-2 
                      hover:from-emerald-100 hover:to-amber-100 hover:border-emerald-300 hover:shadow-md
                      text-emerald-700 transition-all duration-300 group"
                  >
                    <TreePine className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                    View Family Tree
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </>
      )}

      {/* ═══ Family Tree Modal ═══ */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#FFF5EE] border border-[#EBE3DB] rounded-[32px] max-w-lg w-full p-6 text-center space-y-6 relative shadow-2xl">
            <button onClick={() => setOpen(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#FAF3EC] flex items-center justify-center hover:bg-[#FDF2E9] hover:text-[#F97316] transition cursor-pointer">
              <X className="w-4 h-4" />
            </button>
            <FamilyTreeVisual family={open} />
          </motion.div>
        </div>
      )}
    </PageWrap>
  );
}

// Fetch families by community_id using auth token
async function apiFetchFamilies(communityId: any): Promise<any[]> {
  const token = localStorage.getItem("wag_token");
  const BASE = import.meta.env.VITE_API_URL || `/api`;
  const res = await fetch(`${BASE}/families/?community_id=${communityId}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) return [];
  return res.json();
}
