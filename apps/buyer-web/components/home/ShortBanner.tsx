import Image from 'next/image';
import { HeroPinCheck } from '@/components/cinematic/HeroPinCheck';

// A short banner like the big marketplaces: one photo, one line, the PIN check. Categories start right
// below it on every screen size.
export function ShortBanner() {
  return (
    <section id="site-pin" className="on-ink relative isolate overflow-hidden bg-ink text-sand scroll-mt-[calc(var(--header-h)+8px)]" aria-label="Sthiva">
      <Image
        src="/cinematic/hero.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover object-[50%_40%] opacity-60"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(11,12,10,0.85)_0%,rgba(11,12,10,0.55)_60%,rgba(11,12,10,0.35)_100%)]" aria-hidden="true" />
      <div className="container-x flex flex-col items-start gap-5 py-8 md:flex-row md:items-center md:justify-between md:gap-10 md:py-12">
        <div className="max-w-xl">
          <h1 className="font-display text-[clamp(1.9rem,4.2vw,3.25rem)] font-bold leading-[1.02] tracking-tightest text-white">
            Building materials,{' '}
            <span className="font-serif font-normal italic text-lime">delivered to your site.</span>
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-white/80 sm:text-[17px]">
            Cement to curtains, from verified suppliers near you. Cash on delivery.
          </p>
        </div>
        <div className="w-full md:max-w-md">
          <HeroPinCheck />
        </div>
      </div>
    </section>
  );
}
