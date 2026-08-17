"""Seed the database with demo content.

Idempotent: running it twice will not duplicate rows. Run with

    python -m app.seed
"""

from __future__ import annotations

import unicodedata

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal, create_all
from app.models.content import SuggestedTopic, VisaRoute
from app.models.forum import Category, Post, Thread
from app.models.lawyer import Firm, Lawyer
from app.models.user import User, UserRole
from app.security import hash_password

# --------------------------------------------------------------------------- #
# Firms
# --------------------------------------------------------------------------- #
FIRMS = [
    ("Liberty Immigration Partners", "New York", "United States", "https://example.com/liberty"),
    ("Golden Gate Visa Group", "San Francisco", "United States", "https://example.com/ggvg"),
    ("Cascadia Immigration Law", "Seattle", "United States", "https://example.com/cascadia"),
    ("Bufete Alonso & Rivas", "Madrid", "Spain", "https://example.com/alonso-rivas"),
    ("Mediterráneo Extranjería", "Barcelona", "Spain", "https://example.com/mediterraneo"),
    ("Costa del Sol Legal", "Málaga", "Spain", "https://example.com/costadelsol"),
    ("Europa Mobility Law", "Brussels", "Belgium", "https://example.com/europa"),
    ("Rhein Migration Kanzlei", "Berlin", "Germany", "https://example.com/rhein"),
    ("Amstel Immigration Advocaten", "Amsterdam", "Netherlands", "https://example.com/amstel"),
]

# name, headline, jurisdiction, city, country, specialties, languages,
# rate, currency, rating, reviews, years, cases, firm index, avatar id
LAWYERS = [
    # ---------------------------- United States ---------------------------- #
    ("Michael Chan", "Employment & Work Visa Lawyer", "US", "Los Angeles", "United States",
     ["work_visa", "business_immigration", "permanent_residency"], ["en", "es"],
     75, "EUR", 4.8, 102, 10, 219, 1, 12),
    ("Alicia Moreno", "Family Immigration Attorney", "US", "Miami", "United States",
     ["family_reunification", "citizenship", "permanent_residency"], ["en", "es"],
     90, "USD", 4.9, 168, 14, 340, 0, 45),
    ("David Okonkwo", "Asylum & Humanitarian Relief", "US", "New York", "United States",
     ["asylum", "deportation_defense", "appeals"], ["en"],
     120, "USD", 4.9, 214, 16, 410, 0, 13),
    ("Priya Raman", "H-1B & Employment-Based Green Cards", "US", "San Francisco", "United States",
     ["work_visa", "permanent_residency", "business_immigration"], ["en"],
     140, "USD", 4.7, 96, 11, 265, 1, 47),
    ("Sarah Whitfield", "Student & Exchange Visitor Visas", "US", "Boston", "United States",
     ["student_visa", "work_visa"], ["en"],
     85, "USD", 4.6, 73, 8, 190, 2, 44),
    ("Marcus Delgado", "Deportation Defense", "US", "Houston", "United States",
     ["deportation_defense", "appeals", "asylum"], ["en", "es"],
     110, "USD", 4.8, 141, 13, 298, 2, 15),
    ("Jennifer Park", "EB-5 Investor Immigration", "US", "Chicago", "United States",
     ["investor_visa", "business_immigration"], ["en"],
     180, "USD", 4.7, 58, 12, 121, 1, 20),
    ("Robert Nkemelu", "Naturalisation & Citizenship", "US", "Atlanta", "United States",
     ["citizenship", "permanent_residency", "family_reunification"], ["en"],
     70, "USD", 4.5, 88, 7, 176, 0, 52),
    ("Elena Vasquez", "Consular Processing Specialist", "US", "San Diego", "United States",
     ["family_reunification", "work_visa"], ["en", "es"],
     95, "USD", 4.6, 64, 9, 158, 2, 32),
    ("Thomas Bergman", "Immigration Appeals & Federal Litigation", "US", "Seattle", "United States",
     ["appeals", "deportation_defense"], ["en"],
     160, "USD", 4.9, 77, 18, 203, 2, 51),

    # -------------------------------- Spain -------------------------------- #
    ("Carmen Alonso", "Abogada de Extranjería", "ES", "Madrid", "Spain",
     ["work_visa", "family_reunification", "citizenship"], ["es", "en"],
     80, "EUR", 4.9, 187, 15, 356, 3, 26),
    ("Javier Rivas", "Arraigo y Regularización", "ES", "Madrid", "Spain",
     ["permanent_residency", "family_reunification"], ["es"],
     65, "EUR", 4.7, 132, 11, 289, 3, 33),
    ("Marta Ferrer", "Golden Visa & Investor Residency", "ES", "Barcelona", "Spain",
     ["golden_visa", "investor_visa", "business_immigration"], ["es", "en"],
     150, "EUR", 4.8, 71, 12, 143, 4, 25),
    ("Alejandro Ruiz", "Digital Nomad & Startup Visas", "ES", "Barcelona", "Spain",
     ["digital_nomad", "business_immigration", "work_visa"], ["es", "en"],
     95, "EUR", 4.8, 118, 8, 214, 4, 11),
    ("Lucía Navarro", "Nacionalidad Española", "ES", "Valencia", "Spain",
     ["citizenship", "permanent_residency"], ["es", "en"],
     70, "EUR", 4.6, 94, 9, 231, 4, 24),
    ("Diego Santos", "Asilo y Protección Internacional", "ES", "Málaga", "Spain",
     ["asylum", "appeals"], ["es", "en"],
     60, "EUR", 4.9, 156, 13, 302, 5, 14),
    ("Isabel Moreno", "Reagrupación Familiar", "ES", "Seville", "Spain",
     ["family_reunification", "citizenship"], ["es"],
     68, "EUR", 4.7, 109, 10, 245, 5, 31),
    ("Pablo Herrera", "Recursos y Contencioso-Administrativo", "ES", "Madrid", "Spain",
     ["appeals", "deportation_defense"], ["es", "en"],
     110, "EUR", 4.8, 82, 14, 187, 3, 3),
    ("Ana Belén Castro", "Estudiantes y Prácticas", "ES", "Granada", "Spain",
     ["student_visa", "work_visa"], ["es", "en"],
     55, "EUR", 4.5, 67, 6, 154, 5, 27),
    ("Sergio Molina", "Cuenta Propia & Autónomos", "ES", "Bilbao", "Spain",
     ["business_immigration", "work_visa", "digital_nomad"], ["es", "en"],
     85, "EUR", 4.6, 73, 9, 168, 4, 8),

    # ----------------------------- European Union --------------------------- #
    ("Sophie Laurent", "EU Blue Card & Free Movement", "EU", "Brussels", "Belgium",
     ["work_visa", "permanent_residency", "business_immigration"], ["en", "es"],
     130, "EUR", 4.8, 124, 13, 276, 6, 41),
    ("Klaus Reinhardt", "German Work & Residence Permits", "EU", "Berlin", "Germany",
     ["work_visa", "permanent_residency", "business_immigration"], ["en"],
     140, "EUR", 4.7, 98, 15, 231, 7, 53),
    ("Femke de Vries", "Dutch Highly Skilled Migrant Route", "EU", "Amsterdam", "Netherlands",
     ["work_visa", "business_immigration", "digital_nomad"], ["en"],
     125, "EUR", 4.8, 87, 10, 194, 8, 28),
    ("Giulia Ricci", "Italian Residency & Citizenship by Descent", "EU", "Milan", "Italy",
     ["citizenship", "permanent_residency", "family_reunification"], ["en", "es"],
     100, "EUR", 4.6, 112, 11, 248, 6, 30),
    ("Henrik Lindqvist", "Nordic Work Permits", "EU", "Stockholm", "Sweden",
     ["work_visa", "family_reunification"], ["en"],
     115, "EUR", 4.5, 54, 8, 132, 6, 54),
    ("Marie Dubois", "French Talent Passport", "EU", "Paris", "France",
     ["work_visa", "business_immigration", "investor_visa"], ["en"],
     135, "EUR", 4.7, 91, 12, 205, 6, 43),
    ("Andrzej Kowalski", "Polish & Central European Permits", "EU", "Warsaw", "Poland",
     ["work_visa", "student_visa"], ["en"],
     70, "EUR", 4.4, 46, 7, 118, 7, 55),
    ("Nadia Haddad", "EU Asylum & Dublin Procedures", "EU", "Vienna", "Austria",
     ["asylum", "appeals", "deportation_defense"], ["en", "es"],
     95, "EUR", 4.9, 143, 14, 289, 7, 49),
    ("Tomás Oliveira", "Portuguese Residency & D7", "EU", "Lisbon", "Portugal",
     ["digital_nomad", "golden_visa", "investor_visa"], ["en", "es"],
     105, "EUR", 4.8, 129, 9, 223, 8, 7),
    ("Ingrid Bakker", "EU Long-Term Residence & Mobility", "EU", "Rotterdam", "Netherlands",
     ["permanent_residency", "work_visa", "citizenship"], ["en"],
     110, "EUR", 4.6, 68, 10, 161, 8, 29),
]

# --------------------------------------------------------------------------- #
# Suggested topics — the cards under "Suggested Topics" on the home screen
# --------------------------------------------------------------------------- #
TOPICS = [
    ("US", "briefcase", "My H-1B was denied.", "Mi H-1B fue denegada.",
     "Appeal options and timelines.", "Opciones de recurso y plazos.",
     "My H-1B petition was denied last month. What are my options to appeal or refile, and how long do I have?",
     "Mi petición de H-1B fue denegada el mes pasado. ¿Qué opciones tengo para recurrir o volver a presentarla, y cuánto tiempo tengo?"),
    ("US", "school", "F-1 to green card.", "De F-1 a green card.",
     "Moving from student to permanent status.", "Pasar de estudiante a residencia permanente.",
     "I am on an F-1 student visa finishing my OPT. What are the realistic paths to a green card from here?",
     "Tengo un visado de estudiante F-1 y estoy terminando mi OPT. ¿Cuáles son las vías realistas hacia la green card?"),
    ("US", "people", "Sponsoring my spouse.", "Traer a mi cónyuge.",
     "Family petition requirements.", "Requisitos de la petición familiar.",
     "I am a US permanent resident and want to bring my spouse from abroad. What does the process look like?",
     "Soy residente permanente en EE. UU. y quiero traer a mi cónyuge desde el extranjero. ¿Cómo es el proceso?"),
    ("ES", "home", "Visado no lucrativo.", "Visado no lucrativo.",
     "Income proof requirements.", "Requisitos de medios económicos.",
     "I want to move to Spain on a non-lucrative visa. How much income do I need to prove, and what documents are required?",
     "Quiero mudarme a España con un visado no lucrativo. ¿Cuántos ingresos debo acreditar y qué documentos necesito?"),
    ("ES", "laptop", "Digital nomad visa.", "Visado de nómada digital.",
     "Remote work under the Startups Act.", "Teletrabajo bajo la Ley de Startups.",
     "I work remotely for a company outside Spain. Do I qualify for the Spanish digital nomad visa, and how do I apply?",
     "Trabajo en remoto para una empresa fuera de España. ¿Cumplo los requisitos del visado de nómada digital y cómo lo solicito?"),
    ("ES", "time", "Arraigo social.", "Arraigo social.",
     "Regularising after three years.", "Regularizarse tras tres años.",
     "I have been living in Spain without papers for three years. Can I apply for arraigo social, and what do I need?",
     "Llevo tres años viviendo en España sin papeles. ¿Puedo solicitar el arraigo social y qué necesito?"),
    ("EU", "card", "EU Blue Card transfer.", "Traslado de Tarjeta Azul UE.",
     "Moving jobs between member states.", "Cambiar de empleo entre estados miembros.",
     "I hold an EU Blue Card in Germany and received an offer in the Netherlands. Can I transfer, or must I reapply?",
     "Tengo una Tarjeta Azul UE en Alemania y he recibido una oferta en Países Bajos. ¿Puedo trasladarla o debo solicitarla de nuevo?"),
    ("EU", "globe", "90/180 Schengen rule.", "Regla 90/180 de Schengen.",
     "How the rolling window is counted.", "Cómo se cuenta la ventana móvil.",
     "I travel in and out of the Schengen area often. Can you explain exactly how the 90/180 day rule is counted?",
     "Entro y salgo del espacio Schengen con frecuencia. ¿Puede explicarme exactamente cómo se cuenta la regla de 90/180 días?"),
    ("EU", "shield", "Long-term EU residence.", "Residencia de larga duración UE.",
     "Qualifying after five years.", "Requisitos tras cinco años.",
     "I have lived in an EU member state for five years on a work permit. How do I get EU long-term resident status?",
     "Llevo cinco años viviendo en un estado miembro de la UE con permiso de trabajo. ¿Cómo obtengo el estatuto de residente de larga duración UE?"),
    ("ALL", "alert", "I overstayed my visa.", "He excedido mi visado.",
     "Understanding bars and options.", "Entender las prohibiciones y opciones.",
     "I overstayed my visa. What are the consequences, and what options do I realistically have now?",
     "He excedido la duración de mi visado. ¿Cuáles son las consecuencias y qué opciones tengo realmente ahora?"),
    ("ALL", "document-text", "Which documents do I need?", "¿Qué documentos necesito?",
     "Build a checklist for my case.", "Crear una lista para mi caso.",
     "Can you help me build a document checklist for my immigration application?",
     "¿Puede ayudarme a crear una lista de documentos para mi solicitud de inmigración?"),
]

# --------------------------------------------------------------------------- #
# Visa routes — reference catalogue
# --------------------------------------------------------------------------- #
VISA_ROUTES = [
    ("US", "H-1B", "H-1B Specialty Occupation", "H-1B Ocupación Especializada",
     "Employer-sponsored work visa for specialty occupations; subject to an annual lottery cap.",
     "Visado de trabajo patrocinado por el empleador para ocupaciones especializadas; sujeto a un cupo anual por sorteo.",
     "approx. 3-8 months", ["work_visa", "business_immigration"], "https://www.uscis.gov/working-in-the-united-states/h-1b-specialty-occupations"),
    ("US", "EB-2 NIW", "EB-2 National Interest Waiver", "EB-2 Exención por Interés Nacional",
     "Employment-based green card that lets you self-petition without an employer or labour certification.",
     "Green card por empleo que permite autopetición sin empleador ni certificación laboral.",
     "approx. 12-24 months", ["permanent_residency", "work_visa"], "https://www.uscis.gov/working-in-the-united-states/permanent-workers/employment-based-immigration-second-preference-eb-2"),
    ("US", "I-130", "Family-Based Petition", "Petición Familiar",
     "Petition by a US citizen or permanent resident for a qualifying family member.",
     "Petición presentada por un ciudadano o residente permanente para un familiar cualificado.",
     "approx. 12-60 months", ["family_reunification"], "https://www.uscis.gov/i-130"),
    ("US", "I-589", "Asylum Application", "Solicitud de Asilo",
     "Protection for those with a well-founded fear of persecution. Generally must be filed within one year of arrival.",
     "Protección para quienes tienen un temor fundado de persecución. Debe presentarse en el plazo de un año desde la llegada.",
     "approx. 6 months-5 years", ["asylum"], "https://www.uscis.gov/i-589"),
    ("ES", "NLV", "Visado de Residencia No Lucrativa", "Visado de Residencia No Lucrativa",
     "Residence without work, based on proven passive income or savings, plus private health insurance.",
     "Residencia sin trabajar, acreditando ingresos pasivos o ahorros suficientes y seguro médico privado.",
     "approx. 1-3 months", ["permanent_residency"], "https://www.exteriores.gob.es"),
    ("ES", "DNV", "Visado de Teletrabajo Internacional", "Visado de Teletrabajo Internacional",
     "Digital nomad visa under the Startups Act for remote workers employed outside Spain.",
     "Visado de nómada digital bajo la Ley de Startups para teletrabajadores con empleo fuera de España.",
     "approx. 20 days-2 months", ["digital_nomad", "business_immigration"], "https://www.inclusion.gob.es"),
    ("ES", "ARRAIGO", "Arraigo Social", "Arraigo Social",
     "Regularisation route after continuous residence in Spain, with social integration and usually a job offer.",
     "Vía de regularización tras residencia continuada en España, con integración social y normalmente oferta de empleo.",
     "approx. 3-6 months", ["permanent_residency", "family_reunification"], "https://www.inclusion.gob.es"),
    ("ES", "NACIONALIDAD", "Nacionalidad por Residencia", "Nacionalidad por Residencia",
     "Citizenship by residence: 2 years for Ibero-American nationals, 10 years in the general case.",
     "Nacionalidad por residencia: 2 años para nacionales iberoamericanos, 10 años en el caso general.",
     "approx. 1-3 years", ["citizenship"], "https://www.mjusticia.gob.es"),
    ("EU", "BLUECARD", "EU Blue Card", "Tarjeta Azul UE",
     "Highly-qualified employment permit valid across participating member states, with intra-EU mobility rights.",
     "Permiso de empleo altamente cualificado válido en los estados miembros participantes, con movilidad intra-UE.",
     "approx. 1-4 months", ["work_visa", "business_immigration"], "https://immigration-portal.ec.europa.eu"),
    ("EU", "EU-LTR", "EU Long-Term Residence", "Residencia de Larga Duración UE",
     "Status after five years of legal continuous residence, granting mobility rights across member states.",
     "Estatuto tras cinco años de residencia legal continuada, con derechos de movilidad entre estados miembros.",
     "approx. 3-6 months", ["permanent_residency", "citizenship"], "https://immigration-portal.ec.europa.eu"),
    ("EU", "FAMILY", "Family Reunification Directive", "Directiva de Reagrupación Familiar",
     "Right of a lawfully resident third-country national to be joined by close family members.",
     "Derecho de un nacional de tercer país residente legal a reagrupar a familiares cercanos.",
     "approx. 3-9 months", ["family_reunification"], "https://immigration-portal.ec.europa.eu"),
]

# --------------------------------------------------------------------------- #
# Tax & corporate structuring
# --------------------------------------------------------------------------- #
TAX_FIRMS = [
    ("Thameside Tax Partners", "London", "United Kingdom", "https://example.com/thameside"),
    ("Atlantic Cross-Border Advisors", "New York", "United States", "https://example.com/atlantic"),
    ("Liffey Corporate Tax", "Dublin", "Ireland", "https://example.com/liffey"),
    ("Iberia Fiscal Asesores", "Madrid", "Spain", "https://example.com/iberia"),
    ("Zuiderkruis Tax Advisory", "Amsterdam", "Netherlands", "https://example.com/zuiderkruis"),
]

# name, headline, jurisdiction, city, country, specialties, languages,
# rate, currency, rating, reviews, years, cases, firm index, avatar id
TAX_ADVISERS = [
    # ------------------------------ United Kingdom ------------------------- #
    ("Eleanor Whitcombe", "US–UK Cross-Border Tax Partner", "UK", "London", "United Kingdom",
     ["us_uk_tax", "corporate_structuring", "cross_border_tax"], ["en"],
     220, "GBP", 4.9, 143, 18, 410, 0, 16),
    ("Rajesh Patel", "Corporate Structuring & Holding Companies", "UK", "London", "United Kingdom",
     ["corporate_structuring", "cross_border_tax", "exit_planning"], ["en"],
     195, "GBP", 4.8, 118, 15, 322, 0, 33),
    ("Fiona Grant", "Transfer Pricing Specialist", "UK", "Manchester", "United Kingdom",
     ["transfer_pricing", "cross_border_tax", "permanent_establishment"], ["en"],
     185, "GBP", 4.7, 74, 13, 196, 0, 45),
    ("Oliver Bexley", "R&D Relief for Technology Companies", "UK", "Cambridge", "United Kingdom",
     ["rd_credits", "corporate_structuring", "personal_tax"], ["en"],
     150, "GBP", 4.6, 92, 10, 258, 0, 51),
    ("Priyanka Shah", "Owner-Managed Business Tax", "UK", "Birmingham", "United Kingdom",
     ["personal_tax", "exit_planning", "corporate_structuring"], ["en"],
     140, "GBP", 4.7, 86, 12, 274, 0, 47),

    # ------------------------------ United States -------------------------- #
    ("Daniel Rosenthal", "International Tax — Inbound & Outbound", "US", "New York", "United States",
     ["cross_border_tax", "us_uk_tax", "corporate_structuring"], ["en"],
     280, "USD", 4.9, 167, 20, 455, 1, 13),
    ("Karen Liu", "Entity Classification & Check-the-Box", "US", "San Francisco", "United States",
     ["corporate_structuring", "cross_border_tax", "permanent_establishment"], ["en"],
     260, "USD", 4.8, 104, 14, 288, 1, 32),
    ("Marcus Webb", "State Nexus & Sales Tax", "US", "Austin", "United States",
     ["vat_sales_tax", "permanent_establishment"], ["en"],
     190, "USD", 4.6, 71, 11, 214, 1, 15),
    ("Sofia Reyes", "Crypto & Digital Asset Tax", "US", "Miami", "United States",
     ["crypto_tax", "personal_tax", "cross_border_tax"], ["en", "es"],
     210, "USD", 4.7, 88, 8, 176, 1, 24),

    # ------------------------------ European Union ------------------------- #
    ("Ciarán Byrne", "Irish Holding Structures", "EU", "Dublin", "Ireland",
     ["corporate_structuring", "cross_border_tax", "exit_planning"], ["en"],
     200, "EUR", 4.8, 96, 16, 301, 2, 53),
    ("Anke Bergmann", "EU Corporate Tax & ATAD", "EU", "Amsterdam", "Netherlands",
     ["cross_border_tax", "transfer_pricing", "corporate_structuring"], ["en"],
     215, "EUR", 4.8, 82, 14, 243, 4, 28),
    ("Luca Moretti", "Permanent Establishment & VAT", "EU", "Milan", "Italy",
     ["permanent_establishment", "vat_sales_tax", "cross_border_tax"], ["en", "es"],
     175, "EUR", 4.6, 67, 12, 198, 4, 30),

    # --------------------------------- Spain ------------------------------- #
    ("Nuria Vidal", "Estructuras Societarias y ETVE", "ES", "Madrid", "Spain",
     ["corporate_structuring", "cross_border_tax", "exit_planning"], ["es", "en"],
     165, "EUR", 4.8, 111, 15, 289, 3, 26),
    ("Álvaro Ibáñez", "Fiscalidad Internacional", "ES", "Barcelona", "Spain",
     ["cross_border_tax", "transfer_pricing", "vat_sales_tax"], ["es", "en"],
     155, "EUR", 4.7, 79, 13, 226, 3, 11),
]

# jurisdiction, icon, title EN/ES, subtitle EN/ES, prompt EN/ES
TAX_TOPICS = [
    ("UK", "git-network", "Should I add a Hold Co?", "¿Necesito una Hold Co?",
     "Group structure for a UK trading company.", "Estructura de grupo para una sociedad británica.",
     "I'm a UK Ltd company director and we process all our transactions in the US. I'm leaning "
     "towards a group: a Hold Co LLC, a new AI trading company LLC, and my current UK Ltd. "
     "I'd like to explore tax efficiencies, risk management, paperwork and costs.",
     "Soy administrador de una sociedad limitada británica y procesamos todas nuestras "
     "transacciones en EE. UU. Estoy valorando crear un grupo: una Hold Co LLC, una nueva "
     "sociedad LLC para la actividad de IA, y mi actual sociedad británica. Me gustaría "
     "analizar la eficiencia fiscal, la gestión del riesgo, el papeleo y los costes."),
    ("UK", "swap", "US LLC owned from the UK.", "LLC estadounidense desde el Reino Unido.",
     "The classification mismatch, explained.", "El conflicto de calificación, explicado.",
     "I'm UK resident and thinking of setting up a US LLC. How does HMRC treat an LLC compared "
     "with the IRS, and what does that mean for double taxation and treaty relief?",
     "Resido en el Reino Unido y estoy pensando en crear una LLC en EE. UU. ¿Cómo trata HMRC "
     "una LLC frente al IRS, y qué implica eso para la doble imposición y el convenio?"),
    ("UK", "business", "UK Ltd with US customers.", "Sociedad británica con clientes en EE. UU.",
     "Do I create a US permanent establishment?", "¿Creo un establecimiento permanente?",
     "My UK Ltd sells software to US customers and we process payments through a US provider. "
     "Do we create a US permanent establishment or a state tax nexus, and what would we owe?",
     "Mi sociedad británica vende software a clientes de EE. UU. y cobramos a través de un "
     "proveedor estadounidense. ¿Creamos un establecimiento permanente o nexo fiscal estatal?"),
    ("US", "layers", "Delaware or Wyoming?", "¿Delaware o Wyoming?",
     "Choosing where to incorporate.", "Dónde constituir la sociedad.",
     "I'm forming a US company as a non-resident founder. What are the real differences between "
     "Delaware and Wyoming for a small software business, including ongoing costs?",
     "Voy a constituir una sociedad en EE. UU. como fundador no residente. ¿Qué diferencias "
     "reales hay entre Delaware y Wyoming para una pequeña empresa de software, con costes?"),
    ("US", "receipt", "Do I have US tax nexus?", "¿Tengo nexo fiscal en EE. UU.?",
     "Remote sellers and state thresholds.", "Vendedores remotos y umbrales estatales.",
     "We sell online to customers across several US states with no office or staff there. "
     "How do economic nexus rules apply to us for sales tax and income tax?",
     "Vendemos en línea a clientes de varios estados de EE. UU. sin oficina ni empleados allí. "
     "¿Cómo nos afectan las reglas de nexo económico para el sales tax y el impuesto sobre la renta?"),
    ("EU", "globe", "Where should my Hold Co sit?", "¿Dónde ubico mi Hold Co?",
     "Comparing EU holding jurisdictions.", "Comparar jurisdicciones de la UE.",
     "I'm comparing EU jurisdictions for a holding company over trading subsidiaries. What "
     "should I weigh up, and how much substance would each one realistically need?",
     "Estoy comparando jurisdicciones de la UE para una sociedad holding sobre filiales "
     "operativas. ¿Qué debo valorar y cuánta sustancia real necesitaría cada una?"),
    ("ES", "calculator", "¿Sociedad o autónomo?", "¿Sociedad o autónomo?",
     "When incorporating starts to pay off.", "Cuándo compensa constituir una sociedad.",
     "I'm freelancing in Spain and my income is growing. At what point does forming an SL make "
     "sense instead of staying autónomo, and what changes in my obligations?",
     "Trabajo como autónomo en España y mis ingresos están creciendo. ¿En qué momento compensa "
     "constituir una SL en lugar de seguir como autónomo, y qué cambia en mis obligaciones?"),
    ("ALL", "cash", "What will this cost to run?", "¿Cuánto cuesta mantenerlo?",
     "Setup and annual cost of a group.", "Coste de constitución y mantenimiento.",
     "Can you break down the realistic setup and annual running costs of a multi-entity "
     "international group — formation, accounts, filings, and adviser fees?",
     "¿Puedes desglosar los costes realistas de constitución y mantenimiento anual de un grupo "
     "internacional con varias sociedades: constitución, cuentas, declaraciones y honorarios?"),
]

FORUM_CATEGORIES = [
    ("us-visas", "US Visas", "Visados de EE. UU.",
     "H-1B, F-1, green cards and consular processing.",
     "H-1B, F-1, green cards y tramitaciÃ³n consular.", "flag", 1),
    ("eu-schengen", "EU & Schengen", "UE y Schengen",
     "Blue Card, free movement and the 90/180 rule.",
     "Tarjeta Azul, libre circulación y la regla 90/180.", "globe", 2),
    ("spain", "Spain", "España",
     "Extranjeria, arraigo, TIE and cita previa survival tips.",
     "Extranjería, arraigo, TIE y consejos para la cita previa.", "sunny", 3),
    ("asylum", "Asylum & Protection", "Asilo y Protección",
     "Asylum procedures, appeals and humanitarian relief.",
     "Procedimientos de asilo, recursos y protección humanitaria.", "shield", 4),
    ("work-permits", "Work Permits", "Permisos de Trabajo",
     "Sponsorship, job changes and self-employment routes.",
     "Patrocinio, cambios de empleo y vías de autoempleo.", "briefcase", 5),
    ("family", "Family Reunification", "Reagrupación Familiar",
     "Spouses, children and dependent relatives.",
     "Cónyuges, hijos y familiares dependientes.", "people", 6),
    ("company-structuring", "Company Structuring", "Estructuras Societarias",
     "Holding companies, groups and where to incorporate.",
     "Sociedades holding, grupos y dónde constituir.", "business", 7),
    ("cross-border-tax", "Cross-Border Tax", "Fiscalidad Internacional",
     "Treaties, permanent establishment and double taxation.",
     "Convenios, establecimiento permanente y doble imposición.", "cash", 8),
]

DEMO_THREADS = [
    ("spain", "Cita previa in Madrid — how are people getting appointments?",
     "I've been refreshing the site for three weeks for my TIE appointment and there is never "
     "anything available. Has anyone found a reliable approach recently? I'd rather not pay one "
     "of those bots if there's a legitimate way.",
     ["Try very early morning, around 08:00, right when slots are released. It took me nine days of trying.",
      "Check the neighbouring provinces too — I got mine in Guadalajara and it was accepted without any issue."]),
    ("us-visas", "H-1B lottery not selected — what did you do next?",
     "Second year not selected. I'm on OPT with about seven months left. Considering a cap-exempt "
     "employer or a master's programme. Curious what actually worked for people here.",
     ["Cap-exempt worked for me — a university research role. No lottery involved at all.",
      "I moved to an O-1 eventually. It's demanding on evidence but there is no cap and no lottery."]),
    ("eu-schengen", "Blue Card holder moving Germany → Netherlands",
     "I have an EU Blue Card issued in Germany and just accepted an offer in Amsterdam. Do I keep "
     "the same card or start over? Getting conflicting answers online.",
     ["You apply in the Netherlands, but your time in Germany counts toward long-term residence. "
      "It's a new card, not a transfer."]),
    ("spain", "Arraigo social approved after 3 years — my timeline",
     "Posting in case it helps someone. Empadronamiento from 2022, contract offer in March, "
     "submitted in April, resolved in about seven weeks. Happy to answer questions.",
     ["Congratulations! Did they ask for the informe de arraigo from your ayuntamiento?",
      "This is really encouraging, thank you for posting the actual dates."]),
    ("family", "Sponsoring spouse from outside the EU — realistic timelines?",
     "I'm a long-term resident in Spain and want to bring my wife. Everything I read gives a "
     "different timeline. What did it actually take for you?",
     ["Ours took about five months from submission to visa issuance, Madrid consulate route."]),
    ("company-structuring", "UK Ltd + US LLC — did anyone regret the Hold Co?",
     "I run a UK Ltd and take all payments through a US processor. Considering a Hold Co over "
     "the UK company and a new US trading entity. For those who did this: was the extra "
     "compliance worth it, or would you keep it simple?",
     ["We added the holding company a year too early. Two more sets of accounts and an extra "
      "adviser bill before there was anything to hold. I'd wait until there's a second "
      "trading entity or an actual investor.",
      "Worth it for us, but only because we had a genuine reason — separating the IP from the "
      "trading risk. Make sure whoever sets it up understands the LLC classification issue."]),
    ("cross-border-tax", "HMRC and US LLCs — what actually happens in practice?",
     "Everyone online says a US LLC is 'transparent'. My accountant says HMRC may see it as "
     "opaque and I could get taxed twice. Which is it?",
     ["Both, unhelpfully. The US treats a single-member LLC as disregarded by default; HMRC "
      "has historically treated it as opaque, so the credit relief doesn't always line up. "
      "Get someone dual-qualified to look at it before you form anything."]),
]


def _slugify(name: str) -> str:
    """ASCII email local-part from a display name — strips accents (Ciarán → ciaran)."""
    decomposed = unicodedata.normalize("NFKD", name)
    ascii_only = "".join(c for c in decomposed if not unicodedata.combining(c))
    return ".".join(part for part in ascii_only.lower().split() if part)


def _get_or_create_admin(db: Session) -> None:
    email = settings.admin_email.lower()
    existing = db.scalar(select(User).where(func.lower(User.email) == email))
    if existing:
        existing.role = UserRole.admin
        return
    db.add(
        User(
            email=email,
            password_hash=hash_password(settings.admin_password),
            full_name="Administrator",
            role=UserRole.admin,
            accepted_disclaimer=True,
        )
    )


def _seed_demo_users(db: Session) -> list[User]:
    demo = [
        ("mike@example.com", "Mike Alvarez", "en"),
        ("lucia@example.com", "Lucia Fernandez", "es"),
        ("amara@example.com", "Amara Diallo", "en"),
    ]
    users: list[User] = []
    for email, name, locale in demo:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(
                email=email,
                password_hash=hash_password("demo12345"),
                full_name=name,
                locale=locale,
                accepted_disclaimer=True,
            )
            db.add(user)
            db.flush()
        users.append(user)
    return users


def run() -> None:
    create_all()
    with SessionLocal() as db:
        _get_or_create_admin(db)

        # Firms
        firms: list[Firm] = []
        for name, city, country, website in FIRMS:
            firm = db.scalar(select(Firm).where(Firm.name == name))
            if firm is None:
                firm = Firm(name=name, city=city, country=country, website=website)
                db.add(firm)
                db.flush()
            firms.append(firm)

        # Lawyers
        for row in LAWYERS:
            (name, headline, jurisdiction, city, country, specialties, languages,
             rate, currency, rating, reviews, years, cases, firm_idx, avatar) = row
            if db.scalar(select(Lawyer).where(Lawyer.name == name)) is not None:
                continue
            slug = _slugify(name)
            db.add(
                Lawyer(
                    firm_id=firms[firm_idx].id,
                    name=name,
                    headline=headline,
                    avatar_url=f"https://i.pravatar.cc/240?img={avatar}",
                    bio=(
                        f"{name} is an immigration lawyer based in {city} with "
                        f"{years} years of practice and {cases} matters handled. "
                        f"Works with clients on {', '.join(s.replace('_', ' ') for s in specialties)}."
                    ),
                    city=city,
                    country=country,
                    jurisdiction=jurisdiction,
                    bar_admission=country,
                    specialties=specialties,
                    languages=languages,
                    hourly_rate=rate,
                    currency=currency,
                    rating=rating,
                    reviews_count=reviews,
                    years_experience=years,
                    cases_count=cases,
                    email=f"{slug}@example.com",
                    whatsapp="+34600000000" if jurisdiction == "ES" else "+15550100000",
                    practices=["immigration"],
                )
            )

        # Tax firms
        tax_firms: list[Firm] = []
        for name, city, country, website in TAX_FIRMS:
            firm = db.scalar(select(Firm).where(Firm.name == name))
            if firm is None:
                firm = Firm(name=name, city=city, country=country, website=website)
                db.add(firm)
                db.flush()
            tax_firms.append(firm)

        # Tax advisers
        for row in TAX_ADVISERS:
            (name, headline, jurisdiction, city, country, specialties, languages,
             rate, currency, rating, reviews, years, cases, firm_idx, avatar) = row
            if db.scalar(select(Lawyer).where(Lawyer.name == name)) is not None:
                continue
            slug = _slugify(name)
            db.add(
                Lawyer(
                    firm_id=tax_firms[firm_idx].id,
                    name=name,
                    headline=headline,
                    avatar_url=f"https://i.pravatar.cc/240?img={avatar}",
                    bio=(
                        f"{name} advises founders and directors from {city} on international "
                        f"tax and corporate structuring, with {years} years in practice and "
                        f"{cases} engagements. Focuses on "
                        f"{', '.join(s.replace('_', ' ') for s in specialties)}."
                    ),
                    city=city,
                    country=country,
                    jurisdiction=jurisdiction,
                    bar_admission=country,
                    specialties=specialties,
                    languages=languages,
                    hourly_rate=rate,
                    currency=currency,
                    rating=rating,
                    reviews_count=reviews,
                    years_experience=years,
                    cases_count=cases,
                    email=f"{slug}@example.com",
                    whatsapp="+447700900000" if jurisdiction == "UK" else "+15550100000",
                    practices=["tax"],
                )
            )

        # Suggested topics — immigration, then tax
        for i, row in enumerate(TOPICS):
            (jur, icon, t_en, t_es, s_en, s_es, p_en, p_es) = row
            if db.scalar(
                select(SuggestedTopic).where(SuggestedTopic.title_en == t_en)
            ) is not None:
                continue
            db.add(
                SuggestedTopic(
                    practice="immigration", jurisdiction=jur, icon=icon,
                    title_en=t_en, title_es=t_es,
                    subtitle_en=s_en, subtitle_es=s_es,
                    prompt_en=p_en, prompt_es=p_es,
                    sort_order=i,
                )
            )

        for i, row in enumerate(TAX_TOPICS):
            (jur, icon, t_en, t_es, s_en, s_es, p_en, p_es) = row
            if db.scalar(
                select(SuggestedTopic).where(SuggestedTopic.title_en == t_en)
            ) is not None:
                continue
            db.add(
                SuggestedTopic(
                    practice="tax", jurisdiction=jur, icon=icon,
                    title_en=t_en, title_es=t_es,
                    subtitle_en=s_en, subtitle_es=s_es,
                    prompt_en=p_en, prompt_es=p_es,
                    sort_order=i,
                )
            )

        # Visa routes
        for row in VISA_ROUTES:
            (jur, code, n_en, n_es, sm_en, sm_es, timeline, specs, url) = row
            if db.scalar(select(VisaRoute).where(VisaRoute.code == code)) is not None:
                continue
            db.add(
                VisaRoute(
                    jurisdiction=jur, code=code, name_en=n_en, name_es=n_es,
                    summary_en=sm_en, summary_es=sm_es,
                    typical_timeline=timeline, specialties=specs, official_url=url,
                )
            )

        # Forum categories
        categories: dict[str, Category] = {}
        for slug, n_en, n_es, d_en, d_es, icon, order in FORUM_CATEGORIES:
            cat = db.scalar(select(Category).where(Category.slug == slug))
            if cat is None:
                cat = Category(
                    slug=slug, name_en=n_en, name_es=n_es,
                    description_en=d_en, description_es=d_es,
                    icon=icon, sort_order=order,
                )
                db.add(cat)
                db.flush()
            categories[slug] = cat

        # Demo threads
        users = _seed_demo_users(db)
        for i, (cat_slug, title, body, replies) in enumerate(DEMO_THREADS):
            if db.scalar(select(Thread).where(Thread.title == title)) is not None:
                continue
            thread = Thread(
                category_id=categories[cat_slug].id,
                author_id=users[i % len(users)].id,
                title=title,
                body=body,
            )
            db.add(thread)
            db.flush()
            for j, reply in enumerate(replies):
                db.add(
                    Post(
                        thread_id=thread.id,
                        author_id=users[(i + j + 1) % len(users)].id,
                        body=reply,
                    )
                )

        db.commit()

        counts = {
            "advisers (total)": db.scalar(select(func.count(Lawyer.id))),
            "  immigration": sum(
                1 for x in db.scalars(select(Lawyer)) if "immigration" in (x.practices or [])
            ),
            "  tax": sum(
                1 for x in db.scalars(select(Lawyer)) if "tax" in (x.practices or [])
            ),
            "topics": db.scalar(select(func.count(SuggestedTopic.id))),
            "visa_routes": db.scalar(select(func.count(VisaRoute.id))),
            "forum_categories": db.scalar(select(func.count(Category.id))),
            "threads": db.scalar(select(func.count(Thread.id))),
            "users": db.scalar(select(func.count(User.id))),
        }

    print("Seed complete:")
    for key, value in counts.items():
        print(f"  {key:18} {value}")
    print(f"\n  Admin login: {settings.admin_email} / {settings.admin_password}")
    print("  Demo login:  mike@example.com / demo12345")


if __name__ == "__main__":
    run()
