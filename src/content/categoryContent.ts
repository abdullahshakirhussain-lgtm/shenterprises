// Landing-page copy for category pages (SEO + buying help), keyed by category slug.
// Prices are deliberately NOT written here — the page shows a live "from Rs. X".
// Categories without an entry simply render without the guide.

export type CategoryContent = {
  /** <meta name="description"> — ~150 characters. */
  meta: string;
  /** One or two sentences shown above the product grid. */
  lead: string;
  /** Short buying guide shown below the grid (each string is a paragraph). */
  guide: string[];
  faq: { q: string; a: string }[];
  /** Slugs of related categories to link to. */
  related: string[];
};

export const CATEGORY_CONTENT: Record<string, CategoryContent> = {
  threads: {
    meta: "Buy sewing thread online in Sri Lanka — colour thread, overlock yarn, 2500M black & white spools and elastic thread. Island-wide cash on delivery.",
    lead: "Sewing thread for home and industrial machines — colour thread, overlock yarn and large 2500M black & white spools.",
    guide: [
      "For everyday stitching on most fabrics, a polyester colour thread is the safe choice: strong, slightly stretchy and colour-fast. Large 2500M spools of black and white are the economical option for tailors who sew every day.",
      "Overlock (serger) machines need overlock yarn, which is softer and bulkier so seams on knits and T-shirts stay flexible. Wheel elastic thread goes in the bobbin for shirring and smocking. Industrial machines also need the right shuttle (bobbin case) for the machine — we carry shuttles for Juki, Zoje, Brother and similar models.",
    ],
    faq: [
      { q: "Which thread should I use for an overlock machine?", a: "Use overlock yarn. It is softer and fuller than normal sewing thread, so seams on knits and stretch fabrics stay soft and don't crack." },
      { q: "Do you deliver thread island-wide?", a: "Yes — to all 25 districts, usually dispatched the same or next day and delivered within 3 days, with cash on delivery." },
    ],
    related: ["needles-pins", "zippers", "tools-accessories"],
  },
  zippers: {
    meta: "Buy zippers online in Sri Lanka — invisible and single-side zips from 6\" to 20\", double-side NSK zips, single pieces or packs of 60–100. Cash on delivery.",
    lead: "Invisible and regular zippers from 6\" to 20\", in many colours — buy single pieces or save with packs of 60 or 100.",
    guide: [
      "Invisible zippers hide in the seam, so only the pull shows — the usual choice for dresses, skirts and frocks. Single-side (regular) zippers show the teeth and are the everyday choice for trousers, bags, pouches and cushion covers.",
      "Pick a length a little longer than the opening — a too-short zip strains the seam. Double-side zippers open from both ends, which suits jackets and luggage. If you sew in quantity, the packs of 60 (invisible) or 100 (single-side) cost much less per zip than single pieces.",
    ],
    faq: [
      { q: "What is the difference between an invisible zipper and a normal zipper?", a: "An invisible zipper's teeth are on the inside, so it disappears into the seam — ideal for dresses and skirts. A normal (single-side) zipper shows its teeth and is stronger for trousers and bags." },
      { q: "Can I buy zippers in bulk?", a: "Yes. Most sizes come as a single piece or as a pack of 60 (invisible) or 100 (single-side), which is cheaper per zipper for tailors and small factories." },
      { q: "Do I need a special foot to sew an invisible zipper?", a: "It's much easier with one. We sell invisible zipper feet in Tools & Accessories." },
    ],
    related: ["tools-accessories", "threads", "buttons"],
  },
  scissors: {
    meta: "Tailoring scissors, rotary cutters, electric scissors and circular blade cutters in Sri Lanka — for home sewing to garment factories. Island-wide delivery.",
    lead: "Cutting tools for every job — from mini thread snips and tailoring shears to rotary cutters, electric scissors and PRIME circular blade cutters.",
    guide: [
      "A good pair of tailoring scissors is the most important cutting tool — keep it for fabric only so the edge stays sharp. Small snips and ring thread cutters are handy at the machine for trimming threads.",
      "Rotary cutters cut cleanly through layers on a mat and are popular for quilting and straight edges. For production work, electric scissors and circular blade cutters cut several layers quickly, and replacement rotary blades are available.",
    ],
    faq: [
      { q: "Which scissors are best for cutting fabric?", a: "Long-blade tailoring scissors, such as our 10\" tailoring scissor. Use them only on fabric — cutting paper dulls the edge." },
      { q: "Do you sell replacement rotary cutter blades?", a: "Yes — rotary cutter blades are listed in this category." },
    ],
    related: ["tools-accessories", "fabric-markers", "needles-pins"],
  },
  elastics: {
    meta: "Buy elastic online in Sri Lanka — 1/8\" to 2\" widths, band elastic and 10 metre rolls in many colours. Island-wide cash on delivery.",
    lead: "Elastic in widths from 1/8\" to 2\", including band elastic and 10 metre rolls, in a range of colours.",
    guide: [
      "Narrow elastic (1/8\" to 1/2\") suits cuffs, sleeves, baby clothes and masks. Mid widths (3/4\" to 1.25\") are the usual choice for skirt and trouser waistbands, and wide or band elastic (1.5\" to 2\") gives a firm, comfortable waistband on uniforms and sportswear.",
      "Measure the waist and cut the elastic a little shorter so it holds without digging in. Buying a longer roll is more economical if you sew waistbands regularly.",
    ],
    faq: [
      { q: "What width of elastic should I use for a waistband?", a: "Usually 3/4\" to 1.25\" for skirts and trousers, and 1.5\" to 2\" (or band elastic) for a firmer, wider waistband." },
      { q: "Do you have coloured elastic?", a: "Yes — most widths come in several colours; pick one on the product page." },
    ],
    related: ["threads", "ribbons", "lace-trims"],
  },
  ribbons: {
    meta: "Satin, organza, metallic and dot ribbons in Sri Lanka — 1/4\" to 2\" widths in many colours, for gift wrapping, crafts and sewing. Cash on delivery.",
    lead: "Satin, organza, metallic and dot ribbons from 1/4\" to 2\" wide, in a wide range of colours.",
    guide: [
      "Satin ribbon is smooth and shiny — the classic choice for bows, hair accessories, trims and gift wrapping. Organza ribbon is sheer and light for a softer look; metallic ribbon adds shine for festive and wedding décor.",
      "Narrow widths (1/4\" to 1/2\") suit fine trims and small bows; 1\" to 2\" widths make fuller bows and stand out on gift boxes and decorations.",
    ],
    faq: [
      { q: "Which ribbon is best for gift wrapping?", a: "1\" or 1.5\" satin ribbon ties the neatest bows; organza and metallic ribbons add a special touch for weddings and celebrations." },
      { q: "How many colours are available?", a: "Many — each ribbon page shows its colours; pick the one you need before adding to cart." },
    ],
    related: ["lace-trims", "craft-accessories", "pearls"],
  },
  buttons: {
    meta: "Buy buttons online in Sri Lanka — shirt, uniform, pearl, glass, fancy and covering buttons, snap buttons and more. Island-wide cash on delivery.",
    lead: "Shirt, uniform, pearl, glass, fancy and covering buttons, plus sew-on snaps — in many sizes and colours.",
    guide: [
      "Button sizes are measured in lignes (L): 20L is about 12.5mm, 24L about 15mm, 28L about 18mm and 32L about 20mm. Shirts typically use 16L–20L buttons; jackets, frocks and blouses often use 24L–32L.",
      "Pearl, glass and fancy buttons dress up blouses and kids' wear, while covering buttons can be covered in your own fabric for a perfect match. Sew-on snap buttons are a neat hidden closure.",
    ],
    faq: [
      { q: "What does 20L or 32L mean on a button?", a: "L stands for ligne, the standard button size. 20L is about 12.5mm across and 32L about 20mm." },
      { q: "Can I cover buttons with my own fabric?", a: "Yes — our covering buttons are made for that, in 22L and 30L sizes." },
    ],
    related: ["threads", "zippers", "pearls"],
  },
  "needles-pins": {
    meta: "Sewing machine needles (DB, DC, Singer), hand sewing needles, pins, tag pins, knitting needles and blouse hooks in Sri Lanka. Cash on delivery.",
    lead: "Machine needles for industrial and home machines, hand sewing and knitting needles, pins and blouse hooks.",
    guide: [
      "Industrial machines use specific needle systems: DB needles fit single-needle lockstitch machines, and DC needles fit most overlock machines. Home machines such as Singer use domestic needles. Always match the system to your machine.",
      "The number is the thickness: 9–11 for fine fabrics, 12–14 for everyday cottons, and 16–18 for denim, canvas and heavy fabric. Change needles regularly — a dull needle causes skipped stitches and snagging.",
    ],
    faq: [
      { q: "Which needle does an industrial lockstitch machine use?", a: "Most single-needle lockstitch machines use DB needles. Overlock machines usually use DC needles." },
      { q: "What needle size should I use for denim?", a: "Size 16 or 18 for denim and other heavy fabrics." },
    ],
    related: ["threads", "tools-accessories", "scissors"],
  },
  "lace-trims": {
    meta: "Lace and trims in Sri Lanka — GPO lace, borders, pearl trims, braiding, piping, pom pom and sequin trims in many colours. Island-wide cash on delivery.",
    lead: "GPO lace, borders, pearl trims, braiding, piping, pom pom and sequin trims — dozens of designs in many colours.",
    guide: [
      "Trims finish a garment: GPO and LS lace for blouses, frocks and sarees, pearl trims for a dressy edge, and braiding and piping for neat borders on cushions and kids' wear.",
      "Check the width and the length per roll or pack on each product before ordering, and buy a little extra — trims are cut to length, so running short mid-project is the most common problem.",
    ],
    faq: [
      { q: "What is GPO lace?", a: "GPO is a popular style of decorative lace used on blouses, frocks and saree jackets, available in many widths and colours." },
      { q: "How much trim should I buy?", a: "Measure the edge you're trimming and add about 10% for corners, joins and mistakes." },
    ],
    related: ["ribbons", "pearls", "buttons"],
  },
  "fabric-markers": {
    meta: "Tailoring chalk and tailoring pencils in Sri Lanka for marking fabric before cutting and sewing. Single pieces or boxes of 12. Cash on delivery.",
    lead: "Tailoring chalk and pencils for marking fabric — they brush or wash away after sewing.",
    guide: [
      "Tailoring chalk draws a clear line on most fabrics and brushes off afterwards; keep a light and a dark colour so marks show on any fabric. Tailoring pencils give a finer line for detailed marking.",
      "Boxes of 12 chalk pieces are the economical choice for tailoring shops.",
    ],
    faq: [
      { q: "Does tailoring chalk wash out?", a: "Yes — it brushes off or washes out. Test on a scrap of delicate fabric first." },
    ],
    related: ["scissors", "tools-accessories", "needles-pins"],
  },
  "tools-accessories": {
    meta: "Sewing tools and accessories in Sri Lanka — presser feet, bobbins, machine lights and motors, thread stands, pliers, irons and more. Cash on delivery.",
    lead: "Presser feet, bobbins, thread stands, machine lights and motors, pliers, irons, glue guns and other sewing-room essentials.",
    guide: [
      "The right presser foot makes difficult jobs easy: zipper and invisible zipper feet for zips, rolled hem feet for fine hems, gathering feet for ruffles and Teflon feet for leather and vinyl. Check that a foot suits your machine type before ordering.",
      "For industrial setups we stock bobbins (Juki and Singer types), bobbin winders, thread stands, tension adjusters, machine lights and motors. Finishing tools include snap button and eyelet pliers, tag guns, measuring tapes and irons.",
    ],
    faq: [
      { q: "Do you have bobbins for industrial machines?", a: "Yes — Juki and Singer type bobbins, plus bobbin winders and storage boxes." },
      { q: "Which presser foot do I need for invisible zippers?", a: "An invisible zipper foot — it rolls the zipper teeth open so you can stitch right next to them." },
    ],
    related: ["needles-pins", "threads", "scissors"],
  },
  pearls: {
    meta: "Craft pearls in Sri Lanka — full, half, flower and revert pearls in 50g packs, 6mm and 8mm, many colours. For sewing, crafts and jewellery. Cash on delivery.",
    lead: "Full, half, flower and revert pearls in 50g packs — 6mm and 8mm sizes in many colours.",
    guide: [
      "Full pearls have a hole through them for stringing and sewing; half (flat-back) pearls glue or iron onto fabric, shoes and crafts. 6mm suits delicate work, while 8mm gives a bolder look.",
      "50g packs go a long way for blouses, bridal wear, hair accessories and jewellery making.",
    ],
    faq: [
      { q: "What is the difference between full and half pearls?", a: "Full pearls are round with a hole for sewing or stringing; half pearls are flat on the back so they can be glued onto a surface." },
    ],
    related: ["lace-trims", "craft-accessories", "buttons"],
  },
  "craft-accessories": {
    meta: "Craft supplies in Sri Lanka — punch needles, embroidery frames, wool, velcro, buckram, cords, pipe cleaners, curtain rings and more. Cash on delivery.",
    lead: "Embroidery frames, punch needles, wool, velcro, buckram, cords, curtain rings and other craft and DIY supplies.",
    guide: [
      "For embroidery and punch-needle work, choose a frame size a little bigger than your design (6\" to 12\" available) and keep the fabric drum-tight. Milk cotton wool and skein thread suit amigurumi, punch needle and decorative projects.",
      "Home and curtain makers will find buckram and curtain stiff for pleated headings, curtain rings and velcro; for kids' and school crafts there are pipe cleaners, cords and floral tape.",
    ],
    faq: [
      { q: "Which embroidery frame size should I buy?", a: "One slightly larger than your design. 8\" and 10\" frames are the most versatile." },
      { q: "What is buckram used for?", a: "Buckram stiffens curtain headings, bags and caps so they hold their shape." },
    ],
    related: ["pearls", "ribbons", "stiffs"],
  },
  stiffs: {
    meta: "Interfacing stiffs in Sri Lanka — red line stiff and paper stiff for collars, cuffs, waistbands and bags. Island-wide cash on delivery.",
    lead: "Stiffening interfacing for collars, cuffs, waistbands, bags and crafts.",
    guide: [
      "Stiff (interfacing) goes inside a garment to give it shape: collars, cuffs, plackets and waistbands stay crisp, and bags and caps keep their form.",
      "Choose a firmer stiff for bags and caps and a lighter one for shirt collars and cuffs.",
    ],
    faq: [
      { q: "What is stiff used for in tailoring?", a: "It's an interfacing placed inside collars, cuffs, waistbands and bags to keep them firm and shaped." },
    ],
    related: ["craft-accessories", "tools-accessories", "threads"],
  },
};
