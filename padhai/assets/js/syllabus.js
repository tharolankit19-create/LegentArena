/* JEE Main syllabus — static reference data (हिंदी).
 *
 * Weightage rules used everywhere in the app:
 *   totalQ / avgQ present  → verified from the JEE Main 2021–2026 chapter-wise
 *                            question analysis (source shown in the UI).
 *   avgQ present, totalQ null → per-paper weightage from the chapter-wise weightage list.
 *   both null              → no verified number exists; the UI prints "—" instead of
 *                            inventing one, and the priority engine falls back to the
 *                            subject median so the chapter is never silently ignored.
 *
 * Compact row format:
 *   [id, नाम, name_en, totalQ, avgQ, difficulty, isSmall, [[टॉपिक, topic_en], …], note?]
 */
(function () {
  const SUBJECTS = [
    { id: 'physics',   hi: 'भौतिक विज्ञान', en: 'Physics',     color: '#2563eb', short: 'भौतिकी' },
    { id: 'chemistry', hi: 'रसायन विज्ञान', en: 'Chemistry',   color: '#0d9488', short: 'रसायन'  },
    { id: 'maths',     hi: 'गणित',          en: 'Mathematics', color: '#c026d3', short: 'गणित'   }
  ];

  const ROWS = {
    physics: [
      ['phy_units', 'मात्रक एवं मापन', 'Units & Measurements', 168, 1.28, 'easy', true, [
        ['विमीय विश्लेषण', 'Dimensional Analysis'],
        ['त्रुटि एवं यथार्थता', 'Errors & Accuracy'],
        ['सार्थक अंक', 'Significant Figures']]],
      ['phy_kinematics', 'गतिकी', 'Kinematics', null, null, 'moderate', false, [
        ['सरल रेखा में गति', 'Motion in a Straight Line'],
        ['प्रक्षेप्य गति', 'Projectile Motion'],
        ['सापेक्ष गति', 'Relative Motion']]],
      ['phy_nlm', 'न्यूटन के गति नियम', 'Laws of Motion', null, null, 'moderate', false, [
        ['मुक्त वस्तु आरेख', 'Free Body Diagram'],
        ['घर्षण', 'Friction'],
        ['संवेग एवं आवेग', 'Momentum & Impulse']]],
      ['phy_wpe', 'कार्य, ऊर्जा एवं शक्ति', 'Work, Energy & Power', null, null, 'moderate', false, [
        ['कार्य-ऊर्जा प्रमेय', 'Work-Energy Theorem'],
        ['स्थितिज ऊर्जा', 'Potential Energy'],
        ['संघट्ट', 'Collisions']]],
      ['phy_circular', 'वृत्तीय गति', 'Circular Motion', null, null, 'moderate', true, [
        ['अभिकेन्द्र त्वरण', 'Centripetal Acceleration'],
        ['बैंकिंग एवं ऊर्ध्वाधर वृत्त', 'Banking & Vertical Circle']]],
      ['phy_rotational', 'घूर्णी गति', 'Rotational Motion', 156, 1.19, 'hard', false, [
        ['जड़त्व आघूर्ण', 'Moment of Inertia'],
        ['कोणीय संवेग संरक्षण', 'Angular Momentum'],
        ['लोटनिक गति', 'Rolling Motion']]],
      ['phy_gravitation', 'गुरुत्वाकर्षण', 'Gravitation', null, null, 'easy', true, [
        ['गुरुत्वीय क्षेत्र एवं विभव', 'Field & Potential'],
        ['उपग्रह एवं पलायन वेग', 'Satellites & Escape Velocity'],
        ['केप्लर के नियम', "Kepler's Laws"]]],
      ['phy_pom', 'द्रव्य के गुण', 'Properties of Matter', 234, 1.79, 'moderate', false, [
        ['प्रत्यास्थता', 'Elasticity'],
        ['तरल स्थैतिकी एवं प्लवन', 'Fluid Statics & Buoyancy'],
        ['श्यानता एवं बर्नूली', 'Viscosity & Bernoulli'],
        ['पृष्ठ तनाव', 'Surface Tension']]],
      ['phy_heat_thermo', 'ऊष्मा एवं ऊष्मागतिकी', 'Heat & Thermodynamics', 315, 2.40, 'moderate', false, [
        ['ऊष्मा स्थानांतरण', 'Heat Transfer'],
        ['अणुगति सिद्धांत', 'Kinetic Theory of Gases'],
        ['ऊष्मागतिकी के नियम', 'Laws of Thermodynamics'],
        ['ऊष्मा इंजन', 'Heat Engines']]],
      ['phy_shm_waves', 'दोलन एवं तरंगें', 'Oscillations & Waves', null, null, 'moderate', false, [
        ['सरल आवर्त गति', 'Simple Harmonic Motion'],
        ['प्रगामी एवं अप्रगामी तरंगें', 'Travelling & Standing Waves'],
        ['डॉप्लर प्रभाव', 'Doppler Effect']]],
      ['phy_electrostatics', 'स्थिर वैद्युतिकी एवं संधारित्र', 'Electrostatics & Capacitors', 299, 2.28, 'moderate', false, [
        ['कूलॉम नियम एवं विद्युत क्षेत्र', 'Coulomb Law & Field'],
        ['गाउस का नियम', 'Gauss Law'],
        ['विद्युत विभव', 'Electric Potential'],
        ['संधारित्र एवं परावैद्युत', 'Capacitors & Dielectrics']]],
      ['phy_current', 'विद्युत धारा', 'Current Electricity', 243, 1.85, 'easy', false, [
        ['ओम नियम एवं प्रतिरोध', "Ohm's Law & Resistance"],
        ['किरचॉफ नियम', "Kirchhoff's Laws"],
        ['व्हीटस्टोन एवं मीटर सेतु', 'Wheatstone & Meter Bridge']]],
      ['phy_magnetics', 'धारा का चुम्बकीय प्रभाव', 'Magnetic Effect of Current', 152, 1.16, 'moderate', false, [
        ['बायो-सावर्ट एवं ऐम्पियर नियम', 'Biot-Savart & Ampere Law'],
        ['चुम्बकीय बल एवं बल-आघूर्ण', 'Magnetic Force & Torque'],
        ['चुम्बकत्व एवं पदार्थ', 'Magnetism & Matter']]],
      ['phy_emi_ac', 'विद्युतचुम्बकीय प्रेरण एवं AC', 'EMI & Alternating Current', null, null, 'moderate', false, [
        ['फैराडे एवं लेंज नियम', 'Faraday & Lenz Law'],
        ['स्वप्रेरकत्व एवं अन्योन्य प्रेरकत्व', 'Self & Mutual Inductance'],
        ['LCR परिपथ एवं अनुनाद', 'LCR Circuit & Resonance']]],
      ['phy_em_waves', 'विद्युतचुम्बकीय तरंगें', 'EM Waves', null, null, 'easy', true, [
        ['विस्थापन धारा', 'Displacement Current'],
        ['विद्युतचुम्बकीय स्पेक्ट्रम', 'EM Spectrum']]],
      ['phy_ray_optics', 'किरण प्रकाशिकी', 'Geometrical Optics', 191, 1.46, 'moderate', false, [
        ['परावर्तन एवं गोलीय दर्पण', 'Reflection & Mirrors'],
        ['अपवर्तन एवं लेंस', 'Refraction & Lenses'],
        ['प्रिज्म एवं वर्ण-विक्षेपण', 'Prism & Dispersion'],
        ['प्रकाशिक यंत्र', 'Optical Instruments']]],
      ['phy_wave_optics', 'तरंग प्रकाशिकी', 'Wave Optics', 70, 0.54, 'moderate', true, [
        ['यंग द्वि-झिरी प्रयोग', "Young's Double Slit"],
        ['विवर्तन एवं ध्रुवण', 'Diffraction & Polarisation']]],
      ['phy_modern', 'आधुनिक भौतिकी', 'Modern Physics', 344, 2.63, 'easy', false, [
        ['प्रकाश-विद्युत प्रभाव', 'Photoelectric Effect'],
        ['बोर मॉडल एवं स्पेक्ट्रम', 'Bohr Model & Spectra'],
        ['नाभिकीय भौतिकी', 'Nuclear Physics'],
        ['द्रव्य तरंगें (द्वैत प्रकृति)', 'Matter Waves']]],
      ['phy_semiconductor', 'अर्धचालक इलेक्ट्रॉनिकी', 'Semiconductors', 159, 1.21, 'easy', true, [
        ['p-n संधि एवं डायोड', 'p-n Junction & Diode'],
        ['ट्रांजिस्टर', 'Transistor'],
        ['लॉजिक गेट', 'Logic Gates']]],
      ['phy_communication', 'संचार व्यवस्था', 'Communication Systems', 30, 0.23, 'easy', true, [
        ['मॉडुलन', 'Modulation'],
        ['तरंग संचरण', 'Wave Propagation']]],
      ['phy_experimental', 'प्रायोगिक भौतिकी', 'Experimental Physics', null, null, 'easy', true, [
        ['वर्नियर एवं स्क्रू गेज', 'Vernier & Screw Gauge'],
        ['त्रुटि विश्लेषण', 'Error Analysis']]]
    ],

    chemistry: [
      ['chem_mole', 'मोल संकल्पना एवं मूल अवधारणाएँ', 'Mole Concept & Basic Concepts', null, 1.00, 'moderate', false, [
        ['मोल एवं मोलरता', 'Mole & Molarity'],
        ['सीमांत अभिकर्मक', 'Limiting Reagent'],
        ['सांद्रता के मात्रक', 'Concentration Terms']]],
      ['chem_atom', 'परमाणु की संरचना', 'Structure of Atom', null, null, 'moderate', false, [
        ['बोर मॉडल', 'Bohr Model'],
        ['क्वांटम संख्याएँ', 'Quantum Numbers'],
        ['इलेक्ट्रॉनिक विन्यास', 'Electronic Configuration']]],
      ['chem_periodic', 'आवर्त सारणी एवं आवर्तिता', 'Periodic Table & Periodicity', null, 1.00, 'easy', true, [
        ['आवर्त गुणधर्म', 'Periodic Properties'],
        ['आयनन ऊर्जा', 'Ionisation Energy']]],
      ['chem_bonding', 'रासायनिक आबंधन', 'Chemical Bonding', null, 2.00, 'hard', false, [
        ['VSEPR एवं संकरण', 'VSEPR & Hybridisation'],
        ['आण्विक कक्षक सिद्धांत', 'Molecular Orbital Theory'],
        ['हाइड्रोजन बंध एवं ध्रुवता', 'H-Bonding & Polarity']]],
      ['chem_thermo', 'ऊष्मागतिकी एवं ऊष्मारसायन', 'Thermodynamics', null, 2.00, 'moderate', false, [
        ['प्रथम नियम एवं एन्थैल्पी', 'First Law & Enthalpy'],
        ['एन्ट्रॉपी एवं गिब्स ऊर्जा', 'Entropy & Gibbs Energy'],
        ['हेस का नियम', "Hess's Law"]]],
      ['chem_redox', 'अपचयोपचय अभिक्रियाएँ', 'Redox Reactions', null, null, 'easy', true, [
        ['ऑक्सीकरण संख्या', 'Oxidation Number'],
        ['समीकरण संतुलन', 'Balancing Redox Equations']]],
      ['chem_solutions', 'विलयन', 'Solutions', null, 1.00, 'easy', false, [
        ['अणुसंख्य गुणधर्म', 'Colligative Properties'],
        ['राउल्ट का नियम', "Raoult's Law"]]],
      ['chem_electrochem', 'विद्युत रसायन', 'Electrochemistry', null, 2.00, 'moderate', false, [
        ['नर्न्स्ट समीकरण', 'Nernst Equation'],
        ['चालकता', 'Conductance'],
        ['विद्युत अपघटन', 'Electrolysis']]],
      ['chem_kinetics', 'रासायनिक बलगतिकी', 'Chemical Kinetics', null, 1.00, 'easy', false, [
        ['अभिक्रिया की कोटि', 'Order of Reaction'],
        ['अर्ध-आयु एवं आरेनियस', 'Half-life & Arrhenius']]],
      ['chem_goc', 'सामान्य कार्बनिक रसायन (GOC)', 'General Organic Chemistry', null, 2.00, 'hard', false, [
        ['प्रेरणिक एवं अनुनाद प्रभाव', 'Inductive & Resonance Effect'],
        ['अम्लता एवं क्षारकता', 'Acidity & Basicity'],
        ['अभिक्रिया मध्यवर्ती', 'Reaction Intermediates']]],
      ['chem_isomerism', 'नामकरण एवं समावयवता', 'Nomenclature & Isomerism', null, 1.00, 'moderate', false, [
        ['संरचनात्मक समावयवता', 'Structural Isomerism'],
        ['त्रिविम समावयवता', 'Stereoisomerism'],
        ['IUPAC नामकरण', 'IUPAC Nomenclature']]],
      ['chem_hydrocarbon', 'हाइड्रोकार्बन', 'Hydrocarbons', null, 1.50, 'moderate', false, [
        ['ऐल्केन एवं ऐल्कीन', 'Alkanes & Alkenes'],
        ['ऐल्काइन', 'Alkynes'],
        ['ऐरोमैटिक यौगिक', 'Aromatic Compounds']]],
      ['chem_haloalkane', 'हैलोऐल्केन एवं हैलोऐरीन', 'Haloalkanes & Haloarenes', null, null, 'moderate', false, [
        ['SN1 एवं SN2', 'SN1 & SN2'],
        ['विलोपन अभिक्रियाएँ', 'Elimination Reactions']]],
      ['chem_alcohol', 'ऐल्कोहॉल, ईथर एवं फीनॉल', 'Alcohol, Ethers & Phenols', null, null, 'moderate', false, [
        ['ऐल्कोहॉल की अभिक्रियाएँ', 'Reactions of Alcohols'],
        ['फीनॉल', 'Phenols'],
        ['ईथर', 'Ethers']]],
      ['chem_carbonyl', 'ऐल्डिहाइड, कीटोन एवं कार्बोक्सिलिक अम्ल', 'Aldehydes, Ketones & Carboxylic Acids', null, 2.00, 'moderate', false, [
        ['नाभिकस्नेही योगात्मक', 'Nucleophilic Addition'],
        ['नामित अभिक्रियाएँ', 'Named Reactions'],
        ['कार्बोक्सिलिक अम्ल', 'Carboxylic Acids']]],
      ['chem_amines', 'ऐमीन', 'Amines', null, 1.25, 'easy', true, [
        ['ऐमीन की क्षारकता', 'Basicity of Amines'],
        ['डाइऐज़ोनियम लवण', 'Diazonium Salts']]],
      ['chem_biomolecules', 'जैव-अणु', 'Biomolecules', null, 1.25, 'easy', true, [
        ['कार्बोहाइड्रेट', 'Carbohydrates'],
        ['प्रोटीन एवं एंजाइम', 'Proteins & Enzymes']]],
      ['chem_p_block', 'p-ब्लॉक तत्व', 'p-Block Elements', null, null, 'moderate', false, [
        ['समूह 13-14', 'Group 13-14'],
        ['समूह 15-16', 'Group 15-16'],
        ['समूह 17-18', 'Group 17-18']]],
      ['chem_d_f_block', 'd एवं f ब्लॉक तत्व', 'd & f Block Elements', null, 1.50, 'easy', true, [
        ['संक्रमण तत्वों के गुण', 'Properties of Transition Elements'],
        ['लैंथेनॉइड एवं ऐक्टिनॉइड', 'Lanthanoids & Actinoids']]],
      ['chem_coordination', 'उपसहसंयोजन यौगिक', 'Coordination Compounds', null, 2.50, 'moderate', false, [
        ['संकुलों का नामकरण', 'Nomenclature of Complexes'],
        ['क्रिस्टल क्षेत्र सिद्धांत', 'Crystal Field Theory'],
        ['समावयवता एवं चुम्बकीय गुण', 'Isomerism & Magnetic Properties']]]
    ],

    maths: [
      ['math_sets', 'समुच्चय, संबंध एवं फलन', 'Sets, Relations & Functions', null, 2.00, 'moderate', false, [
        ['समुच्चय एवं संबंध', 'Sets & Relations'],
        ['फलन के प्रकार', 'Types of Functions'],
        ['प्रांत एवं परिसर', 'Domain & Range']]],
      ['math_complex', 'सम्मिश्र संख्याएँ', 'Complex Numbers', null, null, 'moderate', false, [
        ['मापांक एवं कोणांक', 'Modulus & Argument'],
        ['द मोइवर प्रमेय', "De Moivre's Theorem"]]],
      ['math_quadratic', 'द्विघात समीकरण', 'Quadratic Equations', null, null, 'easy', true, [
        ['मूलों की प्रकृति', 'Nature of Roots'],
        ['मूल एवं गुणांक में संबंध', 'Roots & Coefficients']]],
      ['math_matrices', 'आव्यूह एवं सारणिक', 'Matrices & Determinants', null, 2.00, 'easy', false, [
        ['सारणिक के गुणधर्म', 'Properties of Determinants'],
        ['व्युत्क्रम आव्यूह', 'Inverse of a Matrix'],
        ['रैखिक समीकरण निकाय', 'System of Linear Equations']]],
      ['math_pnc_prob', 'क्रमचय-संचय एवं प्रायिकता', 'P & C + Probability', null, 2.00, 'hard', false, [
        ['क्रमचय एवं संचय', 'Permutations & Combinations'],
        ['सप्रतिबंध प्रायिकता', 'Conditional Probability'],
        ['द्विपद बंटन', 'Binomial Distribution']]],
      ['math_binomial', 'द्विपद प्रमेय', 'Binomial Theorem', null, 1.00, 'easy', true, [
        ['व्यापक पद', 'General Term'],
        ['गुणांकों के गुणधर्म', 'Properties of Coefficients']]],
      ['math_sequence', 'अनुक्रम एवं श्रेणी', 'Sequence & Series', null, 2.00, 'moderate', false, [
        ['समांतर एवं गुणोत्तर श्रेढ़ी', 'AP & GP'],
        ['विशेष श्रेणियों का योग', 'Sum of Special Series']]],
      ['math_limits', 'सीमा, सांतत्य एवं अवकलनीयता', 'Limits, Continuity & Differentiability', null, 1.50, 'moderate', false, [
        ['सीमा का मान', 'Evaluation of Limits'],
        ['सांतत्य', 'Continuity'],
        ['अवकलनीयता', 'Differentiability']]],
      ['math_mod', 'अवकलन की विधियाँ', 'Method of Differentiation', null, null, 'easy', true, [
        ['श्रृंखला नियम', 'Chain Rule'],
        ['अस्पष्ट एवं प्राचलिक अवकलन', 'Implicit & Parametric']]],
      ['math_aod', 'अवकलज के अनुप्रयोग', 'Application of Derivatives', null, 1.00, 'moderate', false, [
        ['उच्चिष्ठ एवं निम्निष्ठ', 'Maxima & Minima'],
        ['स्पर्श रेखा एवं अभिलंब', 'Tangent & Normal'],
        ['वर्धमान एवं ह्रासमान फलन', 'Monotonicity']]],
      ['math_indefinite', 'अनिश्चित समाकलन', 'Indefinite Integration', null, null, 'moderate', false, [
        ['प्रतिस्थापन विधि', 'Substitution'],
        ['खंडशः समाकलन', 'Integration by Parts']]],
      ['math_definite', 'निश्चित समाकलन', 'Definite Integration', null, null, 'hard', false, [
        ['निश्चित समाकलन के गुणधर्म', 'Properties of Definite Integrals'],
        ['योग की सीमा के रूप में', 'Limit as a Sum']]],
      ['math_auc', 'वक्र के अंतर्गत क्षेत्रफल', 'Area Under Curve', null, null, 'easy', true, [
        ['वक्रों के बीच क्षेत्रफल', 'Area Between Curves']]],
      ['math_differential', 'अवकल समीकरण', 'Differential Equations', null, 1.00, 'easy', false, [
        ['चर पृथक्करण', 'Variable Separable'],
        ['रैखिक अवकल समीकरण', 'Linear Differential Equations']]],
      ['math_straight_line', 'सरल रेखा', 'Straight Line', null, null, 'easy', true, [
        ['रेखा के समीकरण', 'Equations of a Line'],
        ['कोण एवं दूरी', 'Angle & Distance']], 'निर्देशांक ज्यामिति समूह ≈ 3–4 प्रश्न/पेपर'],
      ['math_circle', 'वृत्त', 'Circle', null, null, 'moderate', false, [
        ['वृत्त का समीकरण', 'Equation of a Circle'],
        ['स्पर्श रेखा एवं जीवा', 'Tangent & Chord']], 'निर्देशांक ज्यामिति समूह ≈ 3–4 प्रश्न/पेपर'],
      ['math_conic', 'शांकव परिच्छेद', 'Conic Sections', null, null, 'hard', false, [
        ['परवलय', 'Parabola'],
        ['दीर्घवृत्त', 'Ellipse'],
        ['अतिपरवलय', 'Hyperbola']], 'निर्देशांक ज्यामिति समूह ≈ 3–4 प्रश्न/पेपर'],
      ['math_vector_3d', 'सदिश एवं त्रिविमीय ज्यामिति', 'Vectors & 3D Geometry', null, 3.50, 'moderate', false, [
        ['सदिश गुणनफल', 'Vector Products'],
        ['रेखा एवं समतल', 'Line & Plane'],
        ['लघुत्तम दूरी', 'Shortest Distance']]],
      ['math_trigonometry', 'त्रिकोणमिति', 'Trigonometry', null, null, 'moderate', false, [
        ['त्रिकोणमितीय समीकरण', 'Trigonometric Equations'],
        ['त्रिभुज के गुणधर्म', 'Properties of Triangles']]],
      ['math_inverse_trig', 'प्रतिलोम त्रिकोणमितीय फलन', 'Inverse Trigonometric Functions', null, null, 'easy', true, [
        ['प्रांत, परिसर एवं सर्वसमिकाएँ', 'Domain, Range & Identities']]],
      ['math_statistics', 'सांख्यिकी', 'Statistics', null, 1.00, 'easy', true, [
        ['माध्य, माध्यिका एवं बहुलक', 'Mean, Median & Mode'],
        ['प्रसरण एवं मानक विचलन', 'Variance & Standard Deviation']]],
      ['math_reasoning', 'गणितीय तर्कशक्ति', 'Mathematical Reasoning', null, null, 'easy', true, [
        ['कथन एवं सत्यता सारणी', 'Statements & Truth Table']]]
    ]
  };

  const DIFF_HI = { easy: 'आसान', moderate: 'मध्यम', hard: 'कठिन' };

  const CHAPTERS = [];
  const TOPICS = [];

  SUBJECTS.forEach(function (sub) {
    ROWS[sub.id].forEach(function (r, i) {
      const [id, hi, en, totalQ, avgQ, difficulty, isSmall, topics, note] = r;
      const topicList = topics.map(function (t, j) {
        const topic = { id: id + '__' + (j + 1), chapterId: id, subjectId: sub.id, hi: t[0], en: t[1] };
        TOPICS.push(topic);
        return topic;
      });
      CHAPTERS.push({
        id: id,
        subjectId: sub.id,
        hi: hi,
        en: en,
        totalQ: totalQ,
        avgQ: avgQ,
        difficulty: difficulty,
        difficultyHi: DIFF_HI[difficulty],
        isSmall: !!isSmall,
        note: note || null,
        order: i,
        topics: topicList,
        // where the weightage number comes from — shown in the UI, never invented
        weightSource: totalQ != null ? 'JEE Main 2021–26 विश्लेषण'
                    : avgQ != null ? 'JEE Main अध्याय-वार वेटेज'
                    : null
      });
    });
  });

  const byId = {};
  CHAPTERS.forEach(function (c) { byId[c.id] = c; });
  const topicById = {};
  TOPICS.forEach(function (t) { topicById[t.id] = t; });
  const subjectById = {};
  SUBJECTS.forEach(function (s) { subjectById[s.id] = s; });

  // Median of the known avgQ values per subject — the fallback weight for chapters
  // whose real number we do not have. Kept explicit so the UI can label it.
  const medianWeight = {};
  SUBJECTS.forEach(function (s) {
    const known = CHAPTERS.filter(function (c) { return c.subjectId === s.id && c.avgQ != null; })
                          .map(function (c) { return Number(c.avgQ); })
                          .sort(function (a, b) { return a - b; });
    medianWeight[s.id] = known.length
      ? (known.length % 2 ? known[(known.length - 1) / 2]
                          : (known[known.length / 2 - 1] + known[known.length / 2]) / 2)
      : 1;
  });

  window.SYLLABUS = {
    subjects: SUBJECTS,
    chapters: CHAPTERS,
    topics: TOPICS,
    chapter: function (id) { return byId[id] || null; },
    topic: function (id) { return topicById[id] || null; },
    subject: function (id) { return subjectById[id] || null; },
    chaptersOf: function (subjectId) {
      return CHAPTERS.filter(function (c) { return c.subjectId === subjectId; });
    },
    // effective weight used for ranking; `known` tells the UI whether to show a source
    weightOf: function (chapter) {
      if (!chapter) return { value: 0, known: false };
      if (chapter.avgQ != null) return { value: Number(chapter.avgQ), known: true };
      return { value: medianWeight[chapter.subjectId] || 1, known: false };
    },
    medianWeight: medianWeight,
    difficultyHi: DIFF_HI
  };
})();
