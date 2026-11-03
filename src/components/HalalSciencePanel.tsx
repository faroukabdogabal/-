import React, { useCallback, useEffect, useState } from 'react';
import { Atom, BookOpen, CheckCircle2, ExternalLink, FlaskConical, Loader2, Search } from 'lucide-react';

interface CompoundExample {
  query: string;
  arabicTitle: string;
  categoryNote: string;
  halalContext: string;
}

const PROPHETIC_AND_HALAL_EXAMPLES: CompoundExample[] = [
  {
    query: 'Thymoquinone',
    arabicTitle: 'الثيموكينون (حبة البركة)',
    categoryNote: 'الطب النبوي والمركبات الطبيعية',
    halalContext: 'المركب الفعال الأساسي في زيت الحبة السوداء (Nigella sativa) — نباتي حلال طيّب.',
  },
  {
    query: 'Oleuropein',
    arabicTitle: 'الأوليوروبين (الزيتون المبارك)',
    categoryNote: 'شجرة مباركة · مضادات الأكسدة',
    halalContext: 'مركب بوليفينولي طبيعي في ثمار وأوراق الزيتون المذكور في سورة النور والتين.',
  },
  {
    query: 'Curcumin',
    arabicTitle: 'الكركمين (ملون طبيعي E100)',
    categoryNote: 'مضافات الأغذية · E100',
    halalContext: 'ملون غذائي نباتي مستخلص من جذور الكركم الطبيعي — بديل نباتي حلال آمن.',
  },
  {
    query: 'Ascorbic Acid',
    arabicTitle: 'حمض الأسكوربيك (فيتامين C · E300)',
    categoryNote: 'مضاد أكسدة غذائي · E300',
    halalContext: 'مادة حافظة ومضادة للأكسدة ذات أصل نباتي/تخميري شائع ومعتمد في الأغذية الحلال.',
  },
  {
    query: 'Riboflavin',
    arabicTitle: 'الريبوفلافين (فيتامين B2 · E101)',
    categoryNote: 'ملون وفيتامين غذائي · E101',
    halalContext: 'ينتج غالباً بالتخمير الميكروبي النباتي الحديث ويُعد حلالاً عند خلو وسط الاستنبات من المشتقات الحيوانية غير المذبوحة.',
  },
  {
    query: 'Carminic Acid',
    arabicTitle: 'حمض الكارمينيك (ملون القرمز E120)',
    categoryNote: 'فحص المضافات الحساسة · E120',
    halalContext: 'يُستخلص من حشرة الكوشينيل؛ تختلف فيه هيئات الاعتماد الغذائي الحلال لذا يُستحسن التحقق من البدائل النباتية كالبنجر (E162).',
  },
];

interface PubChemCompoundData {
  cid: number;
  queryName: string;
  iupacName: string;
  molecularFormula: string;
  molecularWeight: number;
  canonicalSmiles: string;
  inchiKey: string;
  xLogP: number | null;
  tpsa: number | null;
  hBondDonorCount: number;
  hBondAcceptorCount: number;
  rotatableBondCount: number;
  depictionUrl: string;
}

interface EuropePmcArticle {
  id: string;
  title: string;
  journalTitle: string;
  pubYear: string;
  authorString: string;
  citedByCount: number;
  doi?: string;
  pmid?: string;
}

async function fetchWithRetry(url: string, retries = 2, delayMs = 650): Promise<Response> {
  const res = await fetch(url);
  if ((res.status === 429 || res.status === 503) && retries > 0) {
    await new Promise((r) => setTimeout(r, delayMs));
    return fetchWithRetry(url, retries - 1, delayMs * 2);
  }
  return res;
}

export function HalalSciencePanel() {
  const [searchTerm, setSearchTerm] = useState<string>('Thymoquinone');
  const [selectedExample, setSelectedExample] = useState<CompoundExample>(
    PROPHETIC_AND_HALAL_EXAMPLES[0]
  );
  const [compound, setCompound] = useState<PubChemCompoundData | null>(null);
  const [articles, setArticles] = useState<EuropePmcArticle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runScientificLookup = useCallback(async (rawQuery: string, matchedPreset?: CompoundExample) => {
    const clean = rawQuery.trim();
    if (!clean) return;

    setIsLoading(true);
    setErrorMsg(null);
    if (matchedPreset) {
      setSelectedExample(matchedPreset);
    }

    try {
      // 1. Resolve PubChem CID by compound name or CID number
      const isNumericCid = /^\d+$/.test(clean);
      let cid = isNumericCid ? Number(clean) : 0;

      if (!cid) {
        const cidRes = await fetchWithRetry(
          `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(
            clean
          )}/cids/JSON`
        );
        if (!cidRes.ok) {
          throw new Error(
            'لم يتم العثور على هذا المركب في قاعدة بيانات PubChem العلمية. جرّب كتابة الاسم العلمي بالإنجليزية مثل Thymoquinone أو Curcumin.'
          );
        }
        const cidJson = (await cidRes.json()) as {
          IdentifierList?: { CID?: number[] };
        };
        cid = cidJson.IdentifierList?.CID?.[0] || 0;
      }

      if (!cid) {
        throw new Error('تعذر تحديد المعرّف الكيميائي القياسي (PubChem CID) للمركب المطلوب.');
      }

      // 2. Fetch Physicochemical & Drug-Likeness Properties + Europe PMC Literature in parallel
      const propsUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/IUPACName,MolecularFormula,MolecularWeight,CanonicalSMILES,ConnectivitySMILES,InChIKey,XLogP,TPSA,HBondDonorCount,HBondAcceptorCount,RotatableBondCount/JSON`;
      const litQuery = encodeURIComponent(`"${clean}" AND (nutrition OR antioxidant OR food OR health)`);
      const litUrl = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${litQuery}&format=json&pageSize=4&sort=CITED%20desc`;

      const [propsRes, litRes] = await Promise.all([
        fetchWithRetry(propsUrl),
        fetchWithRetry(litUrl).catch(() => null),
      ]);

      if (!propsRes.ok) {
        throw new Error('تعذر جلب الخصائص الجزيئية من خدمة PubChem PUG REST.');
      }

      const propsJson = (await propsRes.json()) as {
        PropertyTable?: {
          Properties?: Array<Record<string, unknown>>;
        };
      };
      const p = propsJson.PropertyTable?.Properties?.[0];
      if (!p) {
        throw new Error('لم تتوفر بيانات خصائص مسجلة لهذا المركب.');
      }

      const mw = Number(p.MolecularWeight) || 0;
      const xlogp = typeof p.XLogP === 'number' ? p.XLogP : p.XLogP != null ? Number(p.XLogP) : null;
      const tpsa = typeof p.TPSA === 'number' ? p.TPSA : p.TPSA != null ? Number(p.TPSA) : null;

      setCompound({
        cid,
        queryName: clean,
        iupacName: String(p.IUPACName || clean),
        molecularFormula: String(p.MolecularFormula || '—'),
        molecularWeight: mw,
        canonicalSmiles: String(p.CanonicalSMILES || p.ConnectivitySMILES || '—'),
        inchiKey: String(p.InChIKey || '—'),
        xLogP: Number.isFinite(xlogp) ? xlogp : null,
        tpsa: Number.isFinite(tpsa) ? tpsa : null,
        hBondDonorCount: Number(p.HBondDonorCount) || 0,
        hBondAcceptorCount: Number(p.HBondAcceptorCount) || 0,
        rotatableBondCount: Number(p.RotatableBondCount) || 0,
        depictionUrl: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?image_size=320x320`,
      });

      if (litRes && litRes.ok) {
        const litJson = (await litRes.json()) as {
          resultList?: {
            result?: Array<Record<string, unknown>>;
          };
        };
        const rawList = litJson.resultList?.result || [];
        setArticles(
          rawList.slice(0, 4).map((item, idx) => ({
            id: String(item.id || idx),
            title: String(item.title || 'بحث علمي محكّم'),
            journalTitle: String(item.journalTitle || 'Europe PMC'),
            pubYear: String(item.pubYear || ''),
            authorString: String(item.authorString || ''),
            citedByCount: Number(item.citedByCount) || 0,
            doi: item.doi ? String(item.doi) : undefined,
            pmid: item.pmid ? String(item.pmid) : undefined,
          }))
        );
      } else {
        setArticles([]);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'حدث خطأ أثناء الاتصال بقواعد البيانات العلمية.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    runScientificLookup(PROPHETIC_AND_HALAL_EXAMPLES[0].query, PROPHETIC_AND_HALAL_EXAMPLES[0]);
  }, [runScientificLookup]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const presetMatch = PROPHETIC_AND_HALAL_EXAMPLES.find(
      (ex) => ex.query.toLowerCase() === searchTerm.trim().toLowerCase()
    );
    runScientificLookup(searchTerm, presetMatch);
  };

  // Lipinski Rule of Five & Veber Oral Bioavailability Metrics
  const lipinskiViolations = compound
    ? [
        compound.molecularWeight > 500,
        compound.xLogP !== null && compound.xLogP > 5,
        compound.hBondDonorCount > 5,
        compound.hBondAcceptorCount > 10,
      ].filter(Boolean).length
    : 0;

  const veberCompliant = compound
    ? compound.rotatableBondCount <= 10 && (compound.tpsa === null || compound.tpsa <= 140)
    : false;

  return (
    <div className="space-y-5">
      {/* Header & Search Form */}
      <div className="rounded-xl border border-slate-800 bg-[#0B0F14] p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-base font-bold text-slate-100">
              <FlaskConical className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>مختبر العلوم الجزيئية للتغذية الطيبة والمضافات الغذائية (Halal & BioScience)</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
              استكشف البنية الكيميائية الحقيقية والخصائص الحيوية والأبحاث المحكّمة لمركبات الطب النبوي والأغذية المباركة والمضافات الغذائية مباشرة عبر قواعد بيانات <span className="font-mono text-slate-300">PubChem</span> و<span className="font-mono text-slate-300">Europe PMC</span>.
            </p>
          </div>
          <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-mono text-emerald-300 shrink-0">
            PubChem PUG REST · Europe PMC
          </span>
        </div>

        <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث بالاسم العلمي بالإنجليزية أو رقم PubChem CID (مثل: Thymoquinone, Oleuropein, Curcumin, 10281)..."
              className="w-full rounded-lg border border-slate-800 bg-[#121820] pr-10 pl-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-300 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري التحليل...</span>
              </>
            ) : (
              <>
                <Atom className="w-4 h-4" />
                <span>فحص المركب علمياً</span>
              </>
            )}
          </button>
        </form>

        {/* Pre-populated Quick-Try Compound Chips */}
        <div className="flex flex-wrap gap-2">
          {PROPHETIC_AND_HALAL_EXAMPLES.map((ex) => {
            const isSelected =
              compound?.queryName.toLowerCase() === ex.query.toLowerCase();
            return (
              <button
                key={ex.query}
                type="button"
                onClick={() => {
                  setSearchTerm(ex.query);
                  runScientificLookup(ex.query, ex);
                }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-emerald-500/70 bg-emerald-500/15 text-emerald-200'
                    : 'border-slate-800 bg-[#121820] text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                {ex.arabicTitle}
              </button>
            );
          })}
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs sm:text-sm text-rose-200">
          {errorMsg}
        </div>
      )}

      {compound && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left/Right Column 1: 2D Structure & Halal/Nutritional Note */}
          <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#0B0F14] p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-slate-100">
                  {selectedExample.query.toLowerCase() ===
                  compound.queryName.toLowerCase()
                    ? selectedExample.arabicTitle
                    : compound.queryName}
                </div>
                <div className="text-xs font-mono text-emerald-400 tabular-nums mt-0.5">
                  PubChem CID: {compound.cid} · {compound.molecularFormula}
                </div>
              </div>
              <a
                href={`https://pubchem.ncbi.nlm.nih.gov/compound/${compound.cid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-700 transition-colors"
              >
                <span>PubChem</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="rounded-xl border border-slate-800 bg-white p-3 flex items-center justify-center">
              <img
                src={compound.depictionUrl}
                alt={`البنية الكيميائية لمركب ${compound.queryName}`}
                className="h-48 w-48 object-contain"
              />
            </div>

            {selectedExample.query.toLowerCase() ===
              compound.queryName.toLowerCase() && (
              <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 space-y-1">
                <div className="text-xs font-semibold text-amber-200">
                  {selectedExample.categoryNote}
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {selectedExample.halalContext}
                </p>
              </div>
            )}

            <div className="space-y-1.5 text-xs">
              <div className="text-slate-400">الاسم المنهجي (IUPAC):</div>
              <div
                dir="ltr"
                className="rounded-lg border border-slate-800 bg-[#121820] px-3 py-2 font-mono text-[11px] text-slate-300 break-all"
              >
                {compound.iupacName}
              </div>
              <div className="text-slate-400 pt-1">بصمة InChIKey القياسية:</div>
              <div
                dir="ltr"
                className="rounded-lg border border-slate-800 bg-[#121820] px-3 py-1.5 font-mono text-[11px] text-emerald-300/90 break-all"
              >
                {compound.inchiKey}
              </div>
            </div>
          </div>

          {/* Column 2: Physicochemical Metrics + Peer-Reviewed Literature */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-xl border border-slate-800 bg-[#0B0F14] p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-slate-100">
                  الخصائص الفيزيائية الكيميائية والتوافر الحيوي
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    قاعدة Lipinski ({4 - lipinskiViolations}/4) ·{' '}
                    {veberCompliant ? 'متوافق مع Veber' : 'جزيء قطبي كبير'}
                  </span>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="rounded-lg border border-slate-800 bg-[#121820] p-3">
                  <div className="text-[11px] text-slate-400">الوزن الجزيئي (MW)</div>
                  <div className="text-sm font-bold font-mono tabular-nums text-slate-100 mt-1">
                    {compound.molecularWeight.toFixed(2)} g/mol
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#121820] p-3">
                  <div className="text-[11px] text-slate-400">معامل الذوبانية (XLogP)</div>
                  <div className="text-sm font-bold font-mono tabular-nums text-slate-100 mt-1">
                    {compound.xLogP !== null ? compound.xLogP.toFixed(2) : '—'}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#121820] p-3">
                  <div className="text-[11px] text-slate-400">السطح القطبي (TPSA)</div>
                  <div className="text-sm font-bold font-mono tabular-nums text-slate-100 mt-1">
                    {compound.tpsa !== null ? `${compound.tpsa.toFixed(1)} Å²` : '—'}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#121820] p-3">
                  <div className="text-[11px] text-slate-400">مانحات الهيدروجين (HBD)</div>
                  <div className="text-sm font-bold font-mono tabular-nums text-slate-100 mt-1">
                    {compound.hBondDonorCount}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#121820] p-3">
                  <div className="text-[11px] text-slate-400">مستقبلات الهيدروجين (HBA)</div>
                  <div className="text-sm font-bold font-mono tabular-nums text-slate-100 mt-1">
                    {compound.hBondAcceptorCount}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#121820] p-3">
                  <div className="text-[11px] text-slate-400">الروابط الدوّارة</div>
                  <div className="text-sm font-bold font-mono tabular-nums text-slate-100 mt-1">
                    {compound.rotatableBondCount}
                  </div>
                </div>
              </div>
            </div>

            {/* Europe PMC Peer-Reviewed Biomedical Literature */}
            <div className="rounded-xl border border-slate-800 bg-[#0B0F14] p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
                  <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>أبرز الأبحاث العلمية المحكّمة (Europe PMC)</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  مرتبة حسب الاستشهادات العلمية
                </span>
              </div>

              {articles.length === 0 ? (
                <p className="text-xs text-slate-400">
                  لا توجد أوراق بحثية مفهرسة مطابقة حالياً لهذا الاستعلام في Europe PMC.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {articles.map((art) => {
                    const href = art.doi
                      ? `https://doi.org/${art.doi}`
                      : art.pmid
                      ? `https://europepmc.org/article/MED/${art.pmid}`
                      : `https://europepmc.org/search?query=${encodeURIComponent(art.title)}`;
                    return (
                      <a
                        key={art.id}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg border border-slate-800 bg-[#121820] p-3 hover:border-emerald-500/50 transition-colors"
                      >
                        <div
                          dir="ltr"
                          className="text-xs sm:text-sm font-semibold text-slate-100 leading-snug"
                        >
                          {art.title}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                          <span dir="ltr" className="truncate max-w-xs">
                            {art.journalTitle} {art.pubYear ? `(${art.pubYear})` : ''}
                          </span>
                          <span className="text-emerald-300 font-mono tabular-nums shrink-0">
                            استشهادات: {art.citedByCount} ↗
                          </span>
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
