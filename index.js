// loeme faili sisu mälusse
const puhver = await Bun.file('LE.txt').arrayBuffer();
const tekst = new TextDecoder('windows-1257').decode(puhver);

// jagame teksti ridadeks
const read = tekst.split('\n');
const varuosad = [];

for (let i = 0; i < read.length; i++) {
    const rida = read[i].trim();
    if (!rida) continue;

    // jagame rea veergudeks tabulaatori järgi ja eemaldame jutumärgid
    const veerud = rida.split('\t').map(s => s.replace(/^"|"$/g, ''));

    varuosad.push({
        id: i + 1,
        sn: veerud[0] || '',
        name: (veerud[1] || '').trim(),
        brand: veerud[9] || '',
        // koma asendame punktiga, et oleks õige number
        priceNet: parseFloat((veerud[8] || '0').replace(',', '.')),
        priceGross: parseFloat((veerud[10] || '0').replace(',', '.'))
    });
}

console.log('laetud: ' + varuosad.length + ' varuosa');

// käivitame serveri
Bun.serve({
    port: 3300,

    async fetch(req) {
        const url = new URL(req.url);

        // avaleht — saadame html lehe
        if (url.pathname === '/') {
            return new Response(Bun.file('public/index.html'));
        }

        // varuosade nimekiri JSON kujul
        if (url.pathname === '/spare-parts') {
            const q = url.searchParams;
            let tulemus = varuosad;

            // otsing nime järgi
            if (q.get('name')) {
                const otsisona = q.get('name').toLowerCase();
                tulemus = tulemus.filter(p => p.name.toLowerCase().includes(otsisona));
            }

            // otsing seerianumbri järgi
            if (q.get('sn')) {
                const otsisona = q.get('sn');
                tulemus = tulemus.filter(p => p.sn.includes(otsisona));
            }

            // järjestamine veeru järgi
            if (q.get('sort')) {
                let veerg = q.get('sort');
                let vastupidi = false;
                if (veerg[0] === '-') {
                    vastupidi = true;
                    veerg = veerg.slice(1);
                }
                tulemus = [...tulemus].sort((a, b) => {
                    if (a[veerg] < b[veerg]) return vastupidi ? 1 : -1;
                    if (a[veerg] > b[veerg]) return vastupidi ? -1 : 1;
                    return 0;
                });
            }

            // lehed (30 tulemust lehel)
            const leht = parseInt(q.get('page')) || 1;
            const lehekohta = 30;
            const kokku = tulemus.length;
            const algus = (leht - 1) * lehekohta;

            return Response.json({
                page: leht,
                perPage: lehekohta,
                total: kokku,
                totalPages: Math.ceil(kokku / lehekohta),
                data: tulemus.slice(algus, algus + lehekohta)
            });
        }

        return new Response('ei leitud', { status: 404 });
    }
});

console.log('server töötab: http://localhost:3300');
