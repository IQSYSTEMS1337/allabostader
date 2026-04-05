// targets.js - THE APEX SHARDING MATRIX (Total Täckning)

const counties = [
    "stockholms-lan", "skane-lan", "vastra-gotalands-lan", 
    "uppsala-lan", "ostergotlands-lan", "sodermanlands-lan",
    "jonkopings-lan", "kronobergs-lan", "kalmar-lan", 
    "gotlands-lan", "blekinge-lan", "hallands-lan", 
    "varmlands-lan", "orebro-lan", "vastmanlands-lan", 
    "dalarnas-lan", "gavleborgs-lan", "vasternorrlands-lan", 
    "jamtlands-lan", "vasterbottens-lan", "norrbottens-lan"
];

const municipalities = [
    "stockholm", "goteborg", "malmo", "uppsala", "vasteras", "orebro", "linkoping", "helsingborg", "jonkoping", "norrkoping",
    "lund", "umea", "gavle", "boras", "sodertalje", "eskilstuna", "halmstad", "vaxjo", "karlstad", "taby", "sundsvall",
    "ostersund", "lulea", "trollhattan", "lidingo", "molndal", "varberg", "ornskoldsvik", "nykoping", "falun", "skelleftea"
];

const generateTargets = () => {
    const t = [];

    // Regional Sharding
    counties.forEach(c => {
        t.push({ name: `Fastighetsbyrån (${c})`, url: `https://www.fastighetsbyran.com/sv/sverige/till-salu/${c}` });
        t.push({ name: `Svensk Fast (${c})`, url: `https://www.svenskfast.se/bostad/${c}/` });
        t.push({ name: `Bjurfors (${c})`, url: `https://www.bjurfors.se/sv/tillsalu/${c}/?view=list` });
        t.push({ name: `Länsförsäkringar (${c})`, url: `https://www.lansfast.se/till-salu/bostad/sok/?q=${c}` });
        t.push({ name: `SkandiaMäklarna (${c})`, url: `https://www.skandiamaklarna.se/till-salu/bostader/${c}` });
    });

    // DeepScan Hemnet
    municipalities.forEach(m => {
        t.push({ name: `DeepScan ${m.toUpperCase()}`, url: `https://www.hemnet.se/bostader?location_ids[]=${m}` });
    });

    // Boutique & Nisch (Rensad från dubbletter)
    const boutique = [
        { name: "Erik Olsson", url: "https://www.erikolsson.se/bostader-till-salu/" },
        { name: "Notar", url: "https://www.notar.se/kopa-bostad/bostader-till-salu" },
        { name: "Mohv", url: "https://www.mohv.se/bostader-till-salu/" },
        { name: "Wrede", url: "https://www.wrede.se/objekt" },
        { name: "Skeppsholmen", url: "https://www.skeppsholmen.se/sv/bostader/" },
        { name: "ESNY", url: "https://esny.se/tillsalu/" },
        { name: "Fantastic Frank", url: "https://www.fantasticfrank.se/bostader-till-salu" },
        { name: "Historiska Hem", url: "https://historiskahem.se/tillsalu/" },
        { name: "Mäklarringen", url: "https://www.maklarringen.se/kopa/sok-bostad/" }
    ];

    return [...t, ...boutique];
};

module.exports = generateTargets();
