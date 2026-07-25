import type { CastMember } from "@/types/media";

interface Props {
  cast: CastMember[];
}

export default function CastRow({ cast }: Props) {
  if (cast.length === 0) return null;

  return (
    <div className="w-full">
      <h3 className="mb-3 text-lg font-bold text-white">الفنان</h3>
      <div className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cast.map((member) => (
          <div key={member.name} className="flex w-[76px] shrink-0 flex-col items-center gap-1.5 text-center">
            <div className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full bg-cardDark ring-[1.5px] ring-white/10">
              {member.photo_url ? (
                <img src={member.photo_url} alt={member.name} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <span className="text-xl font-bold text-white/70">{member.name.trim().charAt(0).toUpperCase()}</span>
              )}
            </div>
            <p className="w-full truncate text-[12px] font-semibold text-white">{member.name}</p>
            {member.role && <p className="w-full truncate text-[10px] text-white/55">{member.role}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
