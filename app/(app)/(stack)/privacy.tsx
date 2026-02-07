import React from "react";
import { ScrollView } from "react-native";
import { Surface, Text, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";

import { settingsStyles } from "@/components/settings/settingsStyles";

const PRIVACY_TEXT = `
Datenschutzerklärung
Präambel
Mit der folgenden Datenschutzerklärung möchten wir Sie darüber aufklären, welche Arten Ihrer personenbezogenen Daten (nachfolgend auch kurz als "Daten" bezeichnet) wir zu welchen Zwecken und in welchem Umfang im Rahmen der Bereitstellung unserer Applikation verarbeiten.
Die verwendeten Begriffe sind nicht geschlechtsspezifisch.
Stand: 3. Februar 2026

Inhaltsübersicht
  ●	Präambel
  ●	Verantwortlicher
  ●	Übersicht der Verarbeitungen
  ●	Maßgebliche Rechtsgrundlagen
  ●	Allgemeine Informationen zur Datenspeicherung und Löschung
  ●	Rechte der betroffenen Personen
  ●	Geschäftliche Leistungen
  ●	Bereitstellung des Onlineangebots und Webhosting
  ●	Kontakt- und Anfrageverwaltung
  ●	Newsletter und elektronische Benachrichtigungen
  ●	Änderung und Aktualisierung
  ●	Begriffsdefinitionen

Verantwortlicher
Jan Schratzberger
E-Mail-Adresse: jjan4661@gmail.com

Übersicht der Verarbeitungen
Die nachfolgende Übersicht fasst die Arten der verarbeiteten Daten und die Zwecke ihrer Verarbeitung zusammen und verweist auf die betroffenen Personen.
Arten der verarbeiteten Daten
  ●	Bestandsdaten.
  ●	Zahlungsdaten.
  ●	Kontaktdaten.
  ●	Inhaltsdaten.
  ●	Vertragsdaten.
  ●	Nutzungsdaten.
  ●	Meta-, Kommunikations- und Verfahrensdaten.
  ●	Protokolldaten.

Kategorien betroffener Personen
  ●	Leistungsempfänger und Auftraggeber.
  ●	Interessenten.
  ●	Kommunikationspartner.
  ●	Nutzer.
  ●	Geschäfts- und Vertragspartner.

Zwecke der Verarbeitung
  ●	Erbringung vertraglicher Leistungen und Erfüllung vertraglicher Pflichten.
  ●	Kommunikation.
  ●	Sicherheitsmaßnahmen.
  ●	Direktmarketing.
  ●	Büro- und Organisationsverfahren.
  ●	Organisations- und Verwaltungsverfahren.
  ●	Feedback.
  ●	Bereitstellung unseres Onlineangebotes und Nutzerfreundlichkeit.
  ●	Informationstechnische Infrastruktur.
  ●	Geschäftsprozesse und betriebswirtschaftliche Verfahren.

Maßgebliche Rechtsgrundlagen
Maßgebliche Rechtsgrundlagen nach der DSGVO: Im Folgenden erhalten Sie eine Übersicht der Rechtsgrundlagen der DSGVO, auf deren Basis wir personenbezogene Daten verarbeiten. Bitte nehmen Sie zur Kenntnis, dass neben den Regelungen der DSGVO nationale Datenschutzvorgaben in Ihrem bzw. unserem Wohn- oder Sitzland gelten können. Sollten ferner im Einzelfall speziellere Rechtsgrundlagen maßgeblich sein, teilen wir Ihnen diese in der Datenschutzerklärung mit.
  ●	Einwilligung (Art. 6 Abs. 1 S. 1 lit. a) DSGVO) - Die betroffene Person hat ihre Einwilligung in die Verarbeitung der sie betreffenden personenbezogenen Daten für einen spezifischen Zweck oder mehrere bestimmte Zwecke gegeben.
  ●	Vertragserfüllung und vorvertragliche Anfragen (Art. 6 Abs. 1 S. 1 lit. b) DSGVO) - Die Verarbeitung ist für die Erfüllung eines Vertrags, dessen Vertragspartei die betroffene Person ist, oder zur Durchführung vorvertraglicher Maßnahmen erforderlich, die auf Anfrage der betroffenen Person erfolgen.
  ●	Rechtliche Verpflichtung (Art. 6 Abs. 1 S. 1 lit. c) DSGVO) - Die Verarbeitung ist zur Erfüllung einer rechtlichen Verpflichtung erforderlich, der der Verantwortliche unterliegt.
  ●	Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSGVO) - die Verarbeitung ist zur Wahrung der berechtigten Interessen des Verantwortlichen oder eines Dritten notwendig, vorausgesetzt, dass die Interessen, Grundrechte und Grundfreiheiten der betroffenen Person, die den Schutz personenbezogener Daten verlangen, nicht überwiegen.

Nationale Datenschutzregelungen in Österreich: Zusätzlich zu den Datenschutzregelungen der DSGVO gelten nationale Regelungen zum Datenschutz in Österreich. Hierzu gehört insbesondere das Bundesgesetz zum Schutz natürlicher Personen bei der Verarbeitung personenbezogener Daten (Datenschutzgesetz – DSG). Das Datenschutzgesetz enthält insbesondere Spezialregelungen zum Recht auf Auskunft, zum Recht auf Richtigstellung oder Löschung, zur Verarbeitung besonderer Kategorien personenbezogener Daten, zur Verarbeitung für andere Zwecke und zur Übermittlung sowie zur automatisierten Entscheidungsfindung im Einzelfall.

Allgemeine Informationen zur Datenspeicherung und Löschung
Wir löschen personenbezogene Daten, die wir verarbeiten, gemäß den gesetzlichen Bestimmungen, sobald die zugrundeliegenden Einwilligungen widerrufen werden oder keine weiteren rechtlichen Grundlagen für die Verarbeitung bestehen. Dies betrifft Fälle, in denen der ursprüngliche Verarbeitungszweck entfällt oder die Daten nicht mehr benötigt werden. Ausnahmen von dieser Regelung bestehen, wenn gesetzliche Pflichten oder besondere Interessen eine längere Aufbewahrung oder Archivierung der Daten erfordern.
Insbesondere müssen Daten, die aus handels- oder steuerrechtlichen Gründen aufbewahrt werden müssen oder deren Speicherung notwendig ist zur Rechtsverfolgung oder zum Schutz der Rechte anderer natürlicher oder juristischer Personen, entsprechend archiviert werden.
Unsere Datenschutzhinweise enthalten zusätzliche Informationen zur Aufbewahrung und Löschung von Daten, die speziell für bestimmte Verarbeitungsprozesse gelten.
Bei mehreren Angaben zur Aufbewahrungsdauer oder Löschungsfristen eines Datums, ist stets die längste Frist maßgeblich. Daten, die nicht mehr für den ursprünglich vorgesehenen Zweck, sondern aufgrund gesetzlicher Vorgaben oder anderer Gründe aufbewahrt werden, verarbeiten wir ausschließlich zu den Gründen, die ihre Aufbewahrung rechtfertigen.
Aufbewahrung und Löschung von Daten: Die folgenden allgemeinen Fristen gelten gemäß österreichischem Recht für die Aufbewahrung und Archivierung personenbezogener Daten, soweit diese zur Erfüllung gesetzlicher Verpflichtungen oder zur Wahrung berechtigter Interessen erforderlich sind:
  ●	7 Jahre Personenbezogene Daten, die im Zusammenhang mit steuerlich relevanten Geschäftsunterlagen verarbeitet werden, werden gemäß § 132 BAO und §§ 190–212 UGB für die Dauer von sieben Jahren aufbewahrt. Dies umfasst insbesondere Bücher und Aufzeichnungen, Jahresabschlüsse, Inventare, Lageberichte, Eröffnungsbilanzen, Buchungsbelege, Rechnungen sowie empfangene und versendete Handels- oder Geschäftsbriefe und sonstige für die Abgabenerhebung bedeutsame Unterlagen. Die Frist beginnt mit dem Ende des Kalenderjahres, für das die letzte Eintragung vorgenommen wurde, und verlängert sich gegebenenfalls, solange die Unterlagen für anhängige abgabenrechtliche Verfahren von Bedeutung sind.
  ●	3 Jahre Daten, die zur Geltendmachung, Ausübung oder Abwehr von Gewährleistungs-, Schadenersatz- oder sonstigen vertraglichen Ansprüchen erforderlich sind, werden für die Dauer der jeweils anwendbaren gesetzlichen Verjährungsfrist gespeichert. Diese beträgt regelmäßig drei Jahre gemäß § 1489 ABGB, sofern keine längeren gesetzlichen Aufbewahrungspflichten bestehen.
Fristbeginn mit Ablauf des Jahres: Beginnt eine Frist nicht ausdrücklich zu einem bestimmten Datum und beträgt sie mindestens ein Jahr, so startet sie automatisch am Ende des Kalenderjahres, in dem das fristauslösende Ereignis eingetreten ist. Im Fall laufender Vertragsverhältnisse, in deren Rahmen Daten gespeichert werden, ist das fristauslösende Ereignis der Zeitpunkt des Wirksamwerdens der Kündigung oder sonstige Beendigung des Rechtsverhältnisses.
Rechte der betroffenen Personen
Rechte der betroffenen Personen aus der DSGVO: Ihnen stehen als Betroffene nach der DSGVO verschiedene Rechte zu, die sich insbesondere aus Art. 15 bis 21 DSGVO ergeben:
  ●	Widerspruchsrecht: Sie haben das Recht, aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit gegen die Verarbeitung der Sie betreffenden personenbezogenen Daten, die aufgrund von Art. 6 Abs. 1 lit. e oder f DSGVO erfolgt, Widerspruch einzulegen; dies gilt auch für ein auf diese Bestimmungen gestütztes Profiling. Werden die Sie betreffenden personenbezogenen Daten verarbeitet, um Direktwerbung zu betreiben, haben Sie das Recht, jederzeit Widerspruch gegen die Verarbeitung der Sie betreffenden personenbezogenen Daten zum Zwecke derartiger Werbung einzulegen; dies gilt auch für das Profiling, soweit es mit solcher Direktwerbung in Verbindung steht.
  ●	Widerrufsrecht bei Einwilligungen: Sie haben das Recht, erteilte Einwilligungen jederzeit zu widerrufen.
  ●	Auskunftsrecht: Sie haben das Recht, eine Bestätigung darüber zu verlangen, ob betreffende Daten verarbeitet werden und auf Auskunft über diese Daten sowie auf weitere Informationen und Kopie der Daten entsprechend den gesetzlichen Vorgaben.
  ●	Recht auf Berichtigung: Sie haben entsprechend den gesetzlichen Vorgaben das Recht, die Vervollständigung der Sie betreffenden Daten oder die Berichtigung der Sie betreffenden unrichtigen Daten zu verlangen.
  ●	Recht auf Löschung und Einschränkung der Verarbeitung: Sie haben nach Maßgabe der gesetzlichen Vorgaben das Recht, zu verlangen, dass Sie betreffende Daten unverzüglich gelöscht werden, bzw. alternativ nach Maßgabe der gesetzlichen Vorgaben eine Einschränkung der Verarbeitung der Daten zu verlangen.
  ●	Recht auf Datenübertragbarkeit: Sie haben das Recht, Sie betreffende Daten, die Sie uns bereitgestellt haben, nach Maßgabe der gesetzlichen Vorgaben in einem strukturierten, gängigen und maschinenlesbaren Format zu erhalten oder deren Übermittlung an einen anderen Verantwortlichen zu fordern.
  ●	Beschwerde bei Aufsichtsbehörde: Sie haben unbeschadet eines anderweitigen verwaltungsrechtlichen oder gerichtlichen Rechtsbehelfs das Recht auf Beschwerde bei einer Aufsichtsbehörde, insbesondere in dem Mitgliedstaat ihres gewöhnlichen Aufenthaltsorts, ihres Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes, wenn Sie der Ansicht sind, dass die Verarbeitung der Sie betreffenden personenbezogenen Daten gegen die Vorgaben der DSGVO verstößt.

Geschäftliche Leistungen
Wir verarbeiten Daten unserer Vertrags- und Geschäftspartner, z. B. Kunden und Interessenten (zusammenfassend als „Vertragspartner" bezeichnet), im Rahmen von vertraglichen und vergleichbaren Rechtsverhältnissen sowie damit verbundenen Maßnahmen und im Hinblick auf die Kommunikation mit den Vertragspartnern (oder vorvertraglich), etwa zur Beantwortung von Anfragen.
Wir verwenden diese Daten, um unsere vertraglichen Verpflichtungen zu erfüllen. Dazu gehören insbesondere die Pflichten zur Erbringung der vereinbarten Leistungen, etwaige Aktualisierungspflichten und Abhilfe bei Gewährleistungs- und sonstigen Leistungsstörungen. Darüber hinaus verwenden wir die Daten zur Wahrung unserer Rechte und zum Zwecke der mit diesen Pflichten verbundenen Verwaltungsaufgaben sowie der Unternehmensorganisation. Zudem verarbeiten wir die Daten auf Grundlage unserer berechtigten Interessen sowohl an einer ordnungsgemäßen und betriebswirtschaftlichen Geschäftsführung als auch an Sicherheitsmaßnahmen zum Schutz unserer Vertragspartner und unseres Geschäftsbetriebs vor Missbrauch, Gefährdung ihrer Daten, Geheimnisse, Informationen und Rechte (z. B. zur Beteiligung von Telekommunikations-, Transport- und sonstigen Hilfsdiensten sowie Subunternehmern, Banken, Steuer- und Rechtsberatern, Zahlungsdienstleistern oder Finanzbehörden). Im Rahmen des geltenden Rechts geben wir die Daten von Vertragspartnern nur insoweit an Dritte weiter, als dies für die vorgenannten Zwecke oder zur Erfüllung gesetzlicher Pflichten erforderlich ist. Über weitere Formen der Verarbeitung, etwa zu Marketingzwecken, werden die Vertragspartner im Rahmen dieser Datenschutzerklärung informiert.
Welche Daten für die vorgenannten Zwecke erforderlich sind, teilen wir den Vertragspartnern vor oder im Rahmen der Datenerhebung, z. B. in Onlineformularen, durch besondere Kennzeichnung (z. B. Farben) bzw. Symbole (z. B. Sternchen o. Ä.), oder persönlich mit.
Wir löschen die Daten nach Ablauf gesetzlicher Gewährleistungs- und vergleichbarer Pflichten, d. h. grundsätzlich nach vier Jahren, es sei denn, dass die Daten in einem Kundenkonto gespeichert werden, z. B., solange sie aus gesetzlichen Gründen der Archivierung aufbewahrt werden müssen (etwa für Steuerzwecke im Regelfall zehn Jahre). Daten, die uns im Rahmen eines Auftrags durch den Vertragspartner offengelegt wurden, löschen wir entsprechend den Vorgaben und grundsätzlich nach Ende des Auftrags.
  ●	Verarbeitete Datenarten: Bestandsdaten (z. B. der vollständige Name, Wohnadresse, Kontaktinformationen, Kundennummer, etc.); Zahlungsdaten (z. B. Bankverbindungen, Rechnungen, Zahlungshistorie); Kontaktdaten (z. B. Post- und E-Mail-Adressen oder Telefonnummern); Vertragsdaten (z. B. Vertragsgegenstand, Laufzeit, Kundenkategorie); Nutzungsdaten (z. B. Seitenaufrufe und Verweildauer, Klickpfade, Nutzungsintensität und -frequenz, verwendete Gerätetypen und Betriebssysteme, Interaktionen mit Inhalten und Funktionen). Meta-, Kommunikations- und Verfahrensdaten (z. B. IP-Adressen, Zeitangaben, Identifikationsnummern, beteiligte Personen).
  ●	Betroffene Personen: Leistungsempfänger und Auftraggeber; Interessenten. Geschäfts- und Vertragspartner.
  ●	Zwecke der Verarbeitung: Erbringung vertraglicher Leistungen und Erfüllung vertraglicher Pflichten; Sicherheitsmaßnahmen; Kommunikation; Büro- und Organisationsverfahren; Organisations- und Verwaltungsverfahren. Geschäftsprozesse und betriebswirtschaftliche Verfahren.
  ●	Aufbewahrung und Löschung: Löschung entsprechend Angaben im Abschnitt "Allgemeine Informationen zur Datenspeicherung und Löschung".
  ●	Rechtsgrundlagen: Vertragserfüllung und vorvertragliche Anfragen (Art. 6 Abs. 1 S. 1 lit. b) DSGVO); Rechtliche Verpflichtung (Art. 6 Abs. 1 S. 1 lit. c) DSGVO). Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSGVO).

Weitere Hinweise zu Verarbeitungsprozessen, Verfahren und Diensten:
  ●	Onlineshop, Bestellformulare, E-Commerce und Leistungserfüllung: Wir verarbeiten die Daten unserer Kunden, um ihnen die Auswahl, den Erwerb, bzw. die Bestellung der gewählten Produkte, Waren sowie verbundener Leistungen, als auch deren Bezahlung und Bereitstellung, bzw. Zustellung, oder Ausführung zu ermöglichen. Sofern für die Ausführung einer Bestellung erforderlich, setzen wir Dienstleister, insbesondere Post-, Speditions- und Versandunternehmen ein, um die Lieferung, bzw. Ausführung gegenüber unseren Kunden durchzuführen. Für die Abwicklung der Zahlungsvorgänge nehmen wir die Dienste von Banken und Zahlungsdienstleistern in Anspruch. Die erforderlichen Angaben sind als solche im Rahmen des Bestell- bzw. vergleichbaren Erwerbsvorgangs gekennzeichnet und umfassen die zur Auslieferung, bzw. Zurverfügungstellung und Abrechnung benötigten Angaben sowie Kontaktinformationen, um etwaige Rücksprache halten zu können; Rechtsgrundlagen: Vertragserfüllung und vorvertragliche Anfragen (Art. 6 Abs. 1 S. 1 lit. b) DSGVO).
Bereitstellung des Onlineangebots und Webhosting
Wir verarbeiten die Daten der Nutzer, um ihnen unsere Online-Dienste zur Verfügung stellen zu können. Zu diesem Zweck verarbeiten wir die IP-Adresse des Nutzers, die notwendig ist, um die Inhalte und Funktionen unserer Online-Dienste an den Browser oder das Endgerät der Nutzer zu übermitteln.
  ●	Verarbeitete Datenarten: Nutzungsdaten (z. B. Seitenaufrufe und Verweildauer, Klickpfade, Nutzungsintensität und -frequenz, verwendete Gerätetypen und Betriebssysteme, Interaktionen mit Inhalten und Funktionen); Meta-, Kommunikations- und Verfahrensdaten (z. B. IP-Adressen, Zeitangaben, Identifikationsnummern, beteiligte Personen); Protokolldaten (z. B. Logfiles betreffend Logins oder den Abruf von Daten oder Zugriffszeiten.). Inhaltsdaten (z. B. textliche oder bildliche Nachrichten und Beiträge sowie die sie betreffenden Informationen, wie z. B. Angaben zur Autorenschaft oder Zeitpunkt der Erstellung).
  ●	Betroffene Personen: Nutzer (z. B. Webseitenbesucher, Nutzer von Onlinediensten).
  ●	Zwecke der Verarbeitung: Bereitstellung unseres Onlineangebotes und Nutzerfreundlichkeit; Informationstechnische Infrastruktur (Betrieb und Bereitstellung von Informationssystemen und technischen Geräten (Computer, Server etc.)). Sicherheitsmaßnahmen.
  ●	Aufbewahrung und Löschung: Löschung entsprechend Angaben im Abschnitt "Allgemeine Informationen zur Datenspeicherung und Löschung".
  ●	Rechtsgrundlagen: Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSGVO).
Weitere Hinweise zu Verarbeitungsprozessen, Verfahren und Diensten:
  ●	Bereitstellung Onlineangebot auf gemietetem Speicherplatz: Für die Bereitstellung unseres Onlineangebotes nutzen wir Speicherplatz, Rechenkapazität und Software, die wir von einem entsprechenden Serveranbieter (auch "Webhoster" genannt) mieten oder anderweitig beziehen; Rechtsgrundlagen: Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSGVO).
  ●	Erhebung von Zugriffsdaten und Logfiles: Der Zugriff auf unser Onlineangebot wird in Form von sogenannten "Server-Logfiles" protokolliert. Zu den Serverlogfiles können die Adresse und der Name der abgerufenen Webseiten und Dateien, Datum und Uhrzeit des Abrufs, übertragene Datenmengen, Meldung über erfolgreichen Abruf, Browsertyp nebst Version, das Betriebssystem des Nutzers, Referrer URL (die zuvor besuchte Seite) und im Regelfall IP-Adressen und der anfragende Provider gehören. Die Serverlogfiles können zum einen zu Sicherheitszwecken eingesetzt werden, z. B. um eine Überlastung der Server zu vermeiden (insbesondere im Fall von missbräuchlichen Angriffen, sogenannten DDoS-Attacken), und zum anderen, um die Auslastung der Server und ihre Stabilität sicherzustellen; Rechtsgrundlagen: Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSGVO). Löschung von Daten: Logfile-Informationen werden für die Dauer von maximal 30 Tagen gespeichert und danach gelöscht oder anonymisiert. Daten, deren weitere Aufbewahrung zu Beweiszwecken erforderlich ist, sind bis zur endgültigen Klärung des jeweiligen Vorfalls von der Löschung ausgenommen.
  ●	E-Mail-Versand und -Hosting: Die von uns in Anspruch genommenen Webhosting-Leistungen umfassen ebenfalls den Versand, den Empfang sowie die Speicherung von E-Mails. Zu diesen Zwecken werden die Adressen der Empfänger sowie Absender als auch weitere Informationen betreffend den E-Mailversand (z. B. die beteiligten Provider) sowie die Inhalte der jeweiligen E-Mails verarbeitet. Die vorgenannten Daten können ferner zu Zwecken der Erkennung von SPAM verarbeitet werden. Wir bitten darum, zu beachten, dass E-Mails im Internet grundsätzlich nicht verschlüsselt versendet werden. Im Regelfall werden E-Mails zwar auf dem Transportweg verschlüsselt, aber (sofern kein sogenanntes Ende-zu-Ende-Verschlüsselungsverfahren eingesetzt wird) nicht auf den Servern, von denen sie abgesendet und empfangen werden. Wir können daher für den Übertragungsweg der E-Mails zwischen dem Absender und dem Empfang auf unserem Server keine Verantwortung übernehmen; Rechtsgrundlagen: Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSGVO).
Kontakt- und Anfrageverwaltung
Bei der Kontaktaufnahme mit uns (z. B. per Post, Kontaktformular, E-Mail, Telefon oder via soziale Medien) sowie im Rahmen bestehender Nutzer- und Geschäftsbeziehungen werden die Angaben der anfragenden Personen verarbeitet, soweit dies zur Beantwortung der Kontaktanfragen und etwaiger angefragter Maßnahmen erforderlich ist.
  ●	Verarbeitete Datenarten: Kontaktdaten (z. B. Post- und E-Mail-Adressen oder Telefonnummern). Inhaltsdaten (z. B. textliche oder bildliche Nachrichten und Beiträge sowie die sie betreffenden Informationen, wie z. B. Angaben zur Autorenschaft oder Zeitpunkt der Erstellung).
  ●	Betroffene Personen: Kommunikationspartner.
  ●	Zwecke der Verarbeitung: Kommunikation; Organisations- und Verwaltungsverfahren; Feedback (z. B. Sammeln von Feedback via Online-Formular). Bereitstellung unseres Onlineangebotes und Nutzerfreundlichkeit.
  ●	Aufbewahrung und Löschung: Löschung entsprechend Angaben im Abschnitt "Allgemeine Informationen zur Datenspeicherung und Löschung".
  ●	Rechtsgrundlagen: Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSGVO).
Newsletter und elektronische Benachrichtigungen
Wir versenden Newsletter, E-Mails und weitere elektronische Benachrichtigungen (nachfolgend „Newsletter") ausschließlich mit der Einwilligung der Empfänger oder aufgrund einer gesetzlichen Grundlage. Sofern im Rahmen einer Anmeldung zum Newsletter dessen Inhalte genannt werden, sind diese Inhalte für die Einwilligung der Nutzer maßgeblich. Für die Anmeldung zu unserem Newsletter ist normalerweise die Angabe Ihrer E-Mail-Adresse ausreichend. Um Ihnen jedoch einen personalisierten Service bieten zu können, bitten wir gegebenenfalls um die Angabe Ihres Namens für eine persönliche Ansprache im Newsletter oder um weitere Informationen, falls diese für den Zweck des Newsletters notwendig sind.
Löschung und Einschränkung der Verarbeitung: Wir können die ausgetragenen E-Mail-Adressen bis zu drei Jahren auf Grundlage unserer berechtigten Interessen speichern, bevor wir sie löschen, um eine ehemals gegebene Einwilligung nachweisen zu können. Die Verarbeitung dieser Daten wird auf den Zweck einer potenziellen Abwehr von Ansprüchen beschränkt. Ein individueller Löschungsantrag ist jederzeit möglich, sofern zugleich das ehemalige Bestehen einer Einwilligung bestätigt wird. Im Fall von Pflichten zur dauerhaften Beachtung von Widersprüchen behalten wir uns die Speicherung der E-Mail-Adresse alleine zu diesem Zweck in einer Sperrliste (sogenannte „Blocklist") vor.
Die Protokollierung des Anmeldeverfahrens erfolgt auf Grundlage unserer berechtigten Interessen zum Zweck des Nachweises seines ordnungsgemäßen Ablaufs. Soweit wir einen Dienstleister mit dem Versand von E-Mails beauftragen, erfolgt dies auf Grundlage unserer berechtigten Interessen an einem effizienten und sicheren Versandsystem.
Inhalte:
Informationen zu Partnern in der App.
  ●	Verarbeitete Datenarten: Bestandsdaten (z. B. der vollständige Name, Wohnadresse, Kontaktinformationen, Kundennummer, etc.); Kontaktdaten (z. B. Post- und E-Mail-Adressen oder Telefonnummern). Meta-, Kommunikations- und Verfahrensdaten (z. B. IP-Adressen, Zeitangaben, Identifikationsnummern, beteiligte Personen).
  ●	Betroffene Personen: Kommunikationspartner.
  ●	Zwecke der Verarbeitung: Direktmarketing (z. B. per E-Mail oder postalisch).
  ●	Rechtsgrundlagen: Einwilligung (Art. 6 Abs. 1 S. 1 lit. a) DSGVO).
  ●	Widerspruchsmöglichkeit (Opt-Out): Sie können den Empfang unseres Newsletters jederzeit kündigen, d. .h. Ihre Einwilligungen widerrufen, bzw. dem weiteren Empfang widersprechen. Einen Link zur Kündigung des Newsletters finden Sie entweder am Ende eines jeden Newsletters oder können sonst eine der oben angegebenen Kontaktmöglichkeiten, vorzugswürdig E-Mail, hierzu nutzen.

Änderung und Aktualisierung
Wir bitten Sie, sich regelmäßig über den Inhalt unserer Datenschutzerklärung zu informieren. Wir passen die Datenschutzerklärung an, sobald die Änderungen der von uns durchgeführten Datenverarbeitungen dies erforderlich machen. Wir informieren Sie, sobald durch die Änderungen eine Mitwirkungshandlung Ihrerseits (z. B. Einwilligung) oder eine sonstige individuelle Benachrichtigung erforderlich wird.
Sofern wir in dieser Datenschutzerklärung Adressen und Kontaktinformationen von Unternehmen und Organisationen angeben, bitten wir zu beachten, dass die Adressen sich über die Zeit ändern können und bitten die Angaben vor Kontaktaufnahme zu prüfen.
Begriffsdefinitionen
In diesem Abschnitt erhalten Sie eine Übersicht über die in dieser Datenschutzerklärung verwendeten Begrifflichkeiten. Soweit die Begrifflichkeiten gesetzlich definiert sind, gelten deren gesetzliche Definitionen. Die nachfolgenden Erläuterungen sollen dagegen vor allem dem Verständnis dienen.
  ●	Bestandsdaten: Bestandsdaten umfassen wesentliche Informationen, die für die Identifikation und Verwaltung von Vertragspartnern, Benutzerkonten, Profilen und ähnlichen Zuordnungen notwendig sind. Diese Daten können u.a. persönliche und demografische Angaben wie Namen, Kontaktinformationen (Adressen, Telefonnummern, E-Mail-Adressen), Geburtsdaten und spezifische Identifikatoren (Benutzer-IDs) beinhalten. Bestandsdaten bilden die Grundlage für jegliche formelle Interaktion zwischen Personen und Diensten, Einrichtungen oder Systemen, indem sie eine eindeutige Zuordnung und Kommunikation ermöglichen.
  ●	Inhaltsdaten: Inhaltsdaten umfassen Informationen, die im Zuge der Erstellung, Bearbeitung und Veröffentlichung von Inhalten aller Art generiert werden. Diese Kategorie von Daten kann Texte, Bilder, Videos, Audiodateien und andere multimediale Inhalte einschließen, die auf verschiedenen Plattformen und Medien veröffentlicht werden. Inhaltsdaten sind nicht nur auf den eigentlichen Inhalt beschränkt, sondern beinhalten auch Metadaten, die Informationen über den Inhalt selbst liefern, wie Tags, Beschreibungen, Autoreninformationen und Veröffentlichungsdaten
  ●	Kontaktdaten: Kontaktdaten sind essentielle Informationen, die die Kommunikation mit Personen oder Organisationen ermöglichen. Sie umfassen u.a. Telefonnummern, postalische Adressen und E-Mail-Adressen, sowie Kommunikationsmittel wie soziale Medien-Handles und Instant-Messaging-Identifikatoren.
  ●	Meta-, Kommunikations- und Verfahrensdaten: Meta-, Kommunikations- und Verfahrensdaten sind Kategorien, die Informationen über die Art und Weise enthalten, wie Daten verarbeitet, übermittelt und verwaltet werden. Meta-Daten, auch bekannt als Daten über Daten, umfassen Informationen, die den Kontext, die Herkunft und die Struktur anderer Daten beschreiben. Sie können Angaben zur Dateigröße, dem Erstellungsdatum, dem Autor eines Dokuments und den Änderungshistorien beinhalten. Kommunikationsdaten erfassen den Austausch von Informationen zwischen Nutzern über verschiedene Kanäle, wie E-Mail-Verkehr, Anrufprotokolle, Nachrichten in sozialen Netzwerken und Chat-Verläufe, inklusive der beteiligten Personen, Zeitstempel und Übertragungswege. Verfahrensdaten beschreiben die Prozesse und Abläufe innerhalb von Systemen oder Organisationen, einschließlich Workflow-Dokumentationen, Protokolle von Transaktionen und Aktivitäten, sowie Audit-Logs, die zur Nachverfolgung und Überprüfung von Vorgängen verwendet werden.
  ●	Nutzungsdaten: Nutzungsdaten beziehen sich auf Informationen, die erfassen, wie Nutzer mit digitalen Produkten, Dienstleistungen oder Plattformen interagieren. Diese Daten umfassen eine breite Palette von Informationen, die aufzeigen, wie Nutzer Anwendungen nutzen, welche Funktionen sie bevorzugen, wie lange sie auf bestimmten Seiten verweilen und über welche Pfade sie durch eine Anwendung navigieren. Nutzungsdaten können auch die Häufigkeit der Nutzung, Zeitstempel von Aktivitäten, IP-Adressen, Geräteinformationen und Standortdaten einschließen. Sie sind besonders wertvoll für die Analyse des Nutzerverhaltens, die Optimierung von Benutzererfahrungen, das Personalisieren von Inhalten und das Verbessern von Produkten oder Dienstleistungen. Darüber hinaus spielen Nutzungsdaten eine entscheidende Rolle beim Erkennen von Trends, Vorlieben und möglichen Problembereichen innerhalb digitaler Angebote
  ●	Personenbezogene Daten: "Personenbezogene Daten" sind alle Informationen, die sich auf eine identifizierte oder identifizierbare natürliche Person (im Folgenden "betroffene Person") beziehen; als identifizierbar wird eine natürliche Person angesehen, die direkt oder indirekt, insbesondere mittels Zuordnung zu einer Kennung wie einem Namen, zu einer Kennnummer, zu Standortdaten, zu einer Online-Kennung (z. B. Cookie) oder zu einem oder mehreren besonderen Merkmalen identifiziert werden kann, die Ausdruck der physischen, physiologischen, genetischen, psychischen, wirtschaftlichen, kulturellen oder sozialen Identität dieser natürlichen Person sind.
  ●	Protokolldaten: Protokolldaten sind Informationen über Ereignisse oder Aktivitäten, die in einem System oder Netzwerk protokolliert wurden. Diese Daten enthalten typischerweise Informationen wie Zeitstempel, IP-Adressen, Benutzeraktionen, Fehlermeldungen und andere Details über die Nutzung oder den Betrieb eines Systems. Protokolldaten werden oft zur Analyse von Systemproblemen, zur Sicherheitsüberwachung oder zur Erstellung von Leistungsberichten verwendet.
  ●	Verantwortlicher: Als "Verantwortlicher" wird die natürliche oder juristische Person, Behörde, Einrichtung oder andere Stelle, die allein oder gemeinsam mit anderen über die Zwecke und Mittel der Verarbeitung von personenbezogenen Daten entscheidet, bezeichnet.
  ●	Verarbeitung: "Verarbeitung" ist jeder mit oder ohne Hilfe automatisierter Verfahren ausgeführte Vorgang oder jede solche Vorgangsreihe im Zusammenhang mit personenbezogenen Daten. Der Begriff reicht weit und umfasst praktisch jeden Umgang mit Daten, sei es das Erheben, das Auswerten, das Speichern, das Übermitteln oder das Löschen.
  ●	Vertragsdaten: Vertragsdaten sind spezifische Informationen, die sich auf die Formalisierung einer Vereinbarung zwischen zwei oder mehr Parteien beziehen. Sie dokumentieren die Bedingungen, unter denen Dienstleistungen oder Produkte bereitgestellt, getauscht oder verkauft werden. Diese Datenkategorie ist wesentlich für die Verwaltung und Erfüllung vertraglicher Verpflichtungen und umfasst sowohl die Identifikation der Vertragsparteien als auch die spezifischen Bedingungen und Konditionen der Vereinbarung. Vertragsdaten können Start- und Enddaten des Vertrages, die Art der vereinbarten Leistungen oder Produkte, Preisvereinbarungen, Zahlungsbedingungen, Kündigungsrechte, Verlängerungsoptionen und spezielle Bedingungen oder Klauseln umfassen. Sie dienen als rechtliche Grundlage für die Beziehung zwischen den Parteien und sind entscheidend für die Klärung von Rechten und Pflichten, die Durchsetzung von Ansprüchen und die Lösung von Streitigkeiten.
  ●	Zahlungsdaten: Zahlungsdaten umfassen sämtliche Informationen, die zur Abwicklung von Zahlungstransaktionen zwischen Käufern und Verkäufern benötigt werden. Diese Daten sind von entscheidender Bedeutung für den elektronischen Handel, das Online-Banking und jede andere Form der finanziellen Transaktion. Sie beinhalten Details wie Kreditkartennummern, Bankverbindungen, Zahlungsbeträge, Transaktionsdaten, Verifizierungsnummern und Rechnungsinformationen. Zahlungsdaten können auch Informationen über den Zahlungsstatus, Rückbuchungen, Autorisierungen und Gebühren enthalten

`.trim();

export default function PrivacyScreen() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={settingsStyles.container}
    >
      <Surface style={settingsStyles.card} mode="elevated">
        <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
          {t("settings.infoSection.privacy")}
        </Text>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, lineHeight: 20 }}
        >
          {PRIVACY_TEXT}
        </Text>
      </Surface>
    </ScrollView>
  );
}
