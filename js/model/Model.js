/**
 * Applikationens modell.
 *
 * Modellen representerar de data som appliktionen hanterar på olika sätt. Data
 * kan vara flyktiga (leva bara medan webbläsarsessionen är öppen) eller
 * permanenta - lagrade i webbläsarens lagringsutrymme (localStorage) eller
 * objektdatabas (indexedDB).
 *
 * @license CC-BY 4.0
 * @property {boolean} advancedMode      Använd "avancerat" visningsläge?
 * @property {string}  caseDirectory     Sökväg till ärendekatalogen.
 * @property {boolean} confirmComponents Bekräfta komponenter vid urval.
 * @property {string}  lastPath          Senast besökta granskningssida.
 */
export class Model {
  // Privata fält.
  static #Indices = {
    AuditsByCase: 'by_case',
    EntriesByCase: 'by_case',
    RequirementsBySample: 'by_sample',
    SamplesByAudit: 'by_audit',
  };

  static #Keys = {
    AdvancedMode: 'advancedMode',
    CaseDirectory: 'caseDir',
    ConfirmComponents: 'confirmComponents',
    LastPath: 'lastPath',
  };

  static #Stores = {
    Audits: 'audits',
    Cases: 'cases',
    Entries: 'entries',
    People: 'people',
    Requirements: 'requirements',
    Samples: 'samples',
    Schedules: 'schedules',
  };

  #database;
  #settings;

  /**
   * Konstruera en modellinstans.
   *
   * @param {Database}       databsae Objektdatabas.
   * @param {SettingStorage} settings Lagringsutrymme för inställningar.
   */
  constructor(database, settings) {
    this.#database = database;
    this.#settings = settings;
  }

  // Åtkomstmetoder för "avancerat" visningsläge.
  get advancedMode() {
    return 'true' === this.#settings.read(Model.#Keys.AdvancedMode);
  }

  set advancedMode(flag) {
    if (null != flag) {
      const value = String(true === flag);
      this.#settings.write(Model.#Keys.AdvancedMode, value);
    }
  }

  /**
   * Hämta alla ärenden i objektdatabasen.
   *
   * De hämtade ärendena populeras inte med granskningar.
   *
   * @see getCase
   * @return {AuditCase[]} En ärendevektor sorterad på ärendenummer.
   */
  async allCases() {
    const store = Model.#Stores.Cases;
    const tx = this.#database.transaction([store]);
    const cursor = tx.objectStore(store).openCursor();
    const data = [];
    for await (const record of cursor) {
      const { value } = record;
      value.id = record.primaryKey;
      data.push(value);
    }
    await tx.complete();
    data.sort((a, b) => a.cn - b.cn);
    const cases = [];
    for (const info of data) {
      const aCase = CaseFactory.build(info);
      aCase.id = info.id;
      cases.push(aCase);
    }
    return cases;
  }

  /**
   * Hämta alla personer i objektdatabasen.
   *
   * @return {Person[]} En personvektor sorterad på efternamn/förnamn.
   */
  async allPeople() {
    const store = Model.#Stores.People;
    const tx = this.#database.transaction([store]);
    const cursor = tx.objectStore(store).openCursor();
    const data = [];
    for await (const record of cursor) {
      const { value } = record;
      value.id = record.primaryKey;
      data.push(value);
    }
    await tx.complete();
    return data
      .map((p) => {
        const person = new Person(p);
        person.id = p.id;
        return person;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'sv'));
  }

  /**
   * Hämta alla tillsynsplaner i objektdatabasen.
   *
   * @return {Schedule[]} En tillsynsplanvektor sorterad på startdatum.
   */
  async allSchedules() {
    const store = Model.#Stores.Schedules;
    const tx = this.#database.transaction([store]);
    const cursor = tx.objectStore(store).openCursor();
    const data = [];
    for await (const record of cursor) {
      const { value } = record;
      value.id = record.primaryKey;
      data.push(value);
    }
    await tx.complete();
    data.sort((a, b) => a.begins - b.begins);
    return data.map((s) => {
      const schedule = new Schedule(s);
      schedule.id = s.id;
      return schedule;
    });
  }

  // Åtkomstmetoder för sökvägen till ärendekatalogen.
  get caseDirectory() {
    return this.#settings.read(Model.#Keys.CaseDirectory);
  }

  set caseDirectory(dir) {
    this.#settings.write(Model.#Keys.CaseDirectory, String(dir));
  }

  /**
   * Stänger anslutningen till objektdatabasen.
   */
  close() {
    this.#database.close();
  }

  // Åtkomstmetoder för bekräfta komponenter vid urval.
  get confirmComponents() {
    return 'false' !== this.#settings.read(Model.#Keys.ConfirmComponents);
  }

  set confirmComponents(flag) {
    if (null != flag) {
      const value = String(true === flag);
      this.#settings.write(Model.#Keys.ConfirmComponents, value);
    }
  }

  /**
   * Radera en granskning.
   *
   * Radera granskningen och alla ingående stickprov, krav och kontroller.
   *
   * @param {number} id Granskningsidentitet.
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async deleteAudit(id) {
    const aStore = Model.#Stores.Audits;
    const stores = [aStore, Model.#Stores.Requirements, Model.#Stores.Samples];
    try {
      const tx = this.#database.transaction(stores, 'readwrite');
      await this.#deleteSamples(tx, id);
      await tx.objectStore(aStore).delete(id);
      await tx.complete();
    } catch (err) {
      throw new Error(`Kan inte radera granskning ${id}: ${err.message}.`);
    }
  }

  /**
   * Radera ett ärende.
   *
   * Radera ärendet och alla ingående loggnoteringar, granskningar, stickprov,
   * krav och kontroller.
   *
   * @param {number} id Numeriskt ärendenummer, t.ex. 20201234.
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async deleteCase(id) {
    const aStore = Model.#Stores.Cases;
    const stores = [
      aStore,
      Model.#Stores.Audits,
      Model.#Stores.Entries,
      Model.#Stores.Requirements,
      Model.#Stores.Samples,
    ];
    try {
      const tx = this.#database.transaction(stores, 'readwrite');
      await this.#deleteAudits(tx, id);
      await this.#deleteEntries(tx, id);
      await tx.objectStore(aStore).delete(id);
      await tx.complete();
    } catch (err) {
      throw new Error(`Kan inte radera ärende #${id}: ${err.message}.`);
    }
  }

  /**
   * Radera en loggnotering.
   *
   * @param {number} id Noteringsidentitet.
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async deleteLogEntry(id) {
    const store = Model.#Stores.Entries;
    try {
      const tx = this.#database.transaction([store], 'readwrite');
      await tx.objectStore(store).delete(id);
      await tx.complete();
    } catch (err) {
      throw new Error(`Kan inte radera loggnotering ${id}: ${err.message}.`);
    }
  }

  /**
   * Radera en person.
   *
   * @param {number} id Personidentitet.
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async deletePerson(id) {
    const store = Model.#Stores.People;
    try {
      const tx = this.#database.transaction([store], 'readwrite');
      await tx.objectStore(store).delete(id);
      await tx.complete();
    } catch (err) {
      throw new Error(`Kan inte radera person #${id}: ${err.message}.`);
    }
  }

  /**
   * Radera ett krav.
   *
   * Radera kravet och alla ingående kontroller.
   *
   * @param {number} key Kravidentitet.
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async deleteRequirement(key) {
    const rStore = Model.#Stores.Requirements;
    try {
      const tx = this.#database.transaction([rStore], 'readwrite');
      await tx.objectStore(rStore).delete(key);
      await tx.complete();
    } catch (err) {
      throw new Error(`Kan inte radera krav #${key}: ${err.message}.`);
    }
  }

  /**
   * Radera alla krav i ett stickprov.
   *
   * Radera kraven och alla ingående kontroller.
   *
   * @param {number} id Stickprovsidentitet.
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async deleteRequirements(id) {
    const rStore = Model.#Stores.Requirements;
    try {
      const tx = this.#database.transaction(rStore, 'readwrite');
      await this.#deleteRequirements(tx, id);
      await tx.complete();
    } catch (err) {
      throw new Error(
        `Kan inte radera krav för stickprov #${id}: ${err.message}.`
      );
    }
  }

  /**
   * Radera ett stickprov.
   *
   * Radera stickprovet och alla ingående krav och kontroller.
   *
   * @param {number} id Stickprovsidentitet.
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async deleteSample(id) {
    const sStore = Model.#Stores.Samples;
    const stores = [sStore, Model.#Stores.Requirements];
    try {
      const tx = this.#database.transaction(stores, 'readwrite');
      await this.#deleteRequirements(tx, id);
      await tx.objectStore(sStore).delete(id);
      await tx.complete();
    } catch (err) {
      throw new Error(`Kan inte radera stickprov #${id}: ${err.message}.`);
    }
  }

  /**
   * Radera en tillsynsplan.
   *
   * @param {number} id Tillsynsplanidentitet.
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async deleteSchedule(id) {
    const store = Model.#Stores.Schedules;
    try {
      const tx = this.#database.transaction([store], 'readwrite');
      await tx.objectStore(store).delete(id);
      await tx.complete();
    } catch (err) {
      throw new Error(`Kan inte radera tillsynsplan #${id}: ${err.message}.`);
    }
  }

  /**
   * Hämta en granskning, inklusive ingående stickprov.
   *
   * @param {number} id           Granskningsidentitet.
   * @param {boolean} [recursive] Populera rekursivt?
   * @return {(Audit|null)}
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async getAudit(id, recursive = false) {
    const aStore = Model.#Stores.Audits;
    const sStore = Model.#Stores.Samples;
    const stores = [aStore, sStore];
    recursive && stores.push(Model.#Stores.Requirements);
    const tx = this.#database.transaction(stores);
    const data = await tx.objectStore(aStore).get(id);
    if (!data) return null;
    const audit = new Audit(data.caseID, data);
    audit.id = id;
    await this.#populateAudit(audit, tx, recursive);
    await tx.complete();
    return audit;
  }

  /**
   * Hämta ett ärende, inklusive ingående granskningar och loggnoteringar.
   *
   * @see allCases
   * @param {number} id Ärendeidentitet.
   * @return {(AuditCase|null)}
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async getCase(id) {
    const aIndex = Model.#Indices.AuditsByCase;
    const aStore = Model.#Stores.Audits;
    const audits = [];
    const cStore = Model.#Stores.Cases;
    const eIndex = Model.#Indices.EntriesByCase;
    const entries = [];
    const eStore = Model.#Stores.Entries;
    const tx = this.#database.transaction([aStore, cStore, eStore]);
    const data = await tx.objectStore(cStore).get(id);
    if (!data) return null;
    const aCase = CaseFactory.build(data);
    aCase.id = id;

    let index = await tx.objectStore(aStore).index(aIndex);
    let cursor = index.openCursor(id);
    for await (const record of cursor) {
      const { value } = record;
      value.id = record.primaryKey;
      audits.push(value);
    }
    for (const info of audits ?? []) {
      const audit = new Audit(id, info);
      audit.id = info.id;
      aCase.setAudit(audit);
    }

    index = await tx.objectStore(eStore).index(eIndex);
    cursor = index.openCursor(id);
    for await (const record of cursor) {
      const { value } = record;
      value.id = record.primaryKey;
      entries.push(value);
    }
    for (const info of entries ?? []) {
      const entry = new LogEntry(id, info);
      entry.id = info.id;
      aCase.setEntry(entry);
    }
    await tx.complete();
    return aCase;
  }

  /**
   * Hämta en loggnotering.
   *
   * @param {number} id Noteringsidentitet.
   * @return {(LogEntry|null)}
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async getLogEntry(id) {
    const store = Model.#Stores.Entries;
    const tx = this.#database.transaction([store]);
    const data = await tx.objectStore(store).get(id);
    const entry = new LogEntry(data.caseID, data);
    entry.id = id;
    return entry;
  }

  /**
   * Hämta en person.
   *
   * @param {number} id Personidentitet.
   * @return {(Person|null)}
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async getPerson(id) {
    const store = Model.#Stores.People;
    const tx = this.#database.transaction([store]);
    const data = await tx.objectStore(store).get(id);
    const person = new Person(data);
    person.id = id;
    return person;
  }

  /**
   * Hämta ett krav.
   *
   * @param {number} key    Kravidentitet.
   * @param {Sample} sample Stickprovet som innehåller kravet.
   * @return {(Requirement|null)}
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async getRequirement(key, sample) {
    const rStore = Model.#Stores.Requirements;
    const tx = this.#database.transaction([rStore]);
    const data = await tx.objectStore(rStore).get(key);
    if (!data) return null;
    const requirement = new Requirement(data.sampleID, data);
    requirement.key = key;
    await tx.complete();
    return requirement;
  }

  /**
   * Hämta ett stickprov, inklusive krav.
   *
   * @param {number} id Stickprovsidentitet.
   * @return {(Sample|null)}
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async getSample(id) {
    const aStore = Model.#Stores.Audits;
    const sStore = Model.#Stores.Samples;
    const rStore = Model.#Stores.Requirements;
    const tx = this.#database.transaction([aStore, rStore, sStore]);
    const sData = await tx.objectStore(sStore).get(id);
    if (!sData) return null;
    const aData = await tx.objectStore(aStore).get(sData.auditID);
    const sample = SampleFactory.build(sData.auditID, sData);
    sample.id = id;
    await this.#populateSample(sample, tx);
    await tx.complete();
    return sample;
  }

  /**
   * Hämta en tillsynsplan.
   *
   * @param {number} id Numeriskt ärendenummer, t.ex. 20201388.
   * @return {(Schedule|null)}
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async getSchedule(id) {
    const store = Model.#Stores.Schedules;
    const tx = this.#database.transaction([store]);
    const data = await tx.objectStore(store).get(id);
    const schedule = new Schedule(data);
    schedule.id = id;
    return schedule;
  }

  // Åtkomstmetoder för senast sparade sökväg (begäran).
  get lastPath() {
    return this.#settings.read(Model.#Keys.LastPath);
  }

  set lastPath(path) {
    this.#settings.write(Model.#Keys.LastPath, String(path));
  }

  /**
   * Hämta alla personer med angiven roll.
   *
   * @param {string} role Roll att söka efter.
   * @return {Person[]}
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async peopleByRole(role) {
    const people = await this.allPeople();
    return people.filter((p) => p.hasRole(role));
  }

  /**
   * Populera ett ärende med alla uppgifter.
   *
   * Populera granskningarna med stickprov, stickproven med krav och kraven
   * med kontroller. Används när användaren vill spara ett komplett ärende som
   * JSON-fil.
   *
   * @param {AuditCase} aCase Ärende att populera.
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async populate(aCase) {
    const stores = [
      Model.#Stores.Entries,
      Model.#Stores.Requirements,
      Model.#Stores.Samples,
    ];
    const tx = this.#database.transaction(stores);
    for (const audit of aCase.audits()) {
      await this.#populateAudit(audit, tx, true);
    }
  }

  /**
   * Spara en granskning i databasen.
   *
   * Spara endast granskningsuppgifterna, inte de ingående stickproven som får
   * sparas separat.
   *
   * @param {Audit} audit Granskning att spara.
   * @throws {TypeError} Granskningen saknar ärendenummer.
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async setAudit(audit) {
    if (!audit.caseID) {
      throw new TypeError('Kan inte spara granskning utan ärendenummer.');
    }
    try {
      const store = Model.#Stores.Audits;
      const tx = this.#database.transaction([store], 'readwrite');
      if (audit.id) {
        await tx.objectStore(store).put(audit.serialize(), audit.id);
      } else {
        audit.id = await tx.objectStore(store).add(audit.serialize());
      }
      await tx.complete();
    } catch (err) {
      throw new Error(`Kan inte spara granskning ${audit}: ${err.message}.`);
    }
  }

  /**
   * Spara en gransknings samtliga stickprov i databasen.
   *
   * Spara endast granskningsuppgifterna, inte de ingående stickproven som får
   * sparas separat.
   *
   * @param {Audit} audit Granskning vars stickprov ska sparas.
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async setAuditSamples(audit) {
    try {
      const store = Model.#Stores.Samples;
      const tx = this.#database.transaction([store], 'readwrite');
      const samples = tx.objectStore(store);
      for (const sample of audit.allSamples()) {
        samples.put(sample.serialize(), sample.id);
      }
      await tx.complete();
    } catch (err) {
      throw new Error(`Kan inte spara stickprov för ${audit}: ${err.message}`);
    }
  }

  /**
   * Spara ett ärende i databasen.
   *
   * Spara endast ärendeuppgifterna, inte de ingående granskningarna som får
   * sparas separat.
   *
   * @param {AuditCase} aCase Ärende att spara.
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async setCase(aCase) {
    try {
      const store = Model.#Stores.Cases;
      const tx = this.#database.transaction([store], 'readwrite');
      if (aCase.id) {
        await tx.objectStore(store).put(aCase.serialize(), aCase.id);
      } else {
        aCase.id = await tx.objectStore(store).add(aCase.serialize());
      }
      await tx.complete();
    } catch (err) {
      throw new Error(`Kan inte spara ärende ${aCase}: ${err.message}.`);
    }
  }

  /**
   * Spara en loggnotering i databasen.
   *
   * @param {LogEntry} entry Loggnotering att spara.
   * @param {TypeError} Loggnoteringen saknar ärende-id.
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async setLogEntry(entry) {
    if (!entry.caseID) {
      throw new TypeError('Kan inte spara loggnotering utan ärende-id.');
    }
    try {
      const store = Model.#Stores.Entries;
      const tx = this.#database.transaction([store], 'readwrite');
      if (entry.id) {
        await tx.objectStore(store).put(entry.serialize(), entry.id);
      } else {
        entry.id = await tx.objectStore(store).add(entry.serialize());
      }
      await tx.complete();
    } catch (err) {
      throw new Error(`Kan inte spara loggnotering ${entry}: ${err.message}.`);
    }
  }

  /**
   * Spara en person i databasen.
   *
   * @param {Person} person Person att spara.
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async setPerson(person) {
    try {
      const store = Model.#Stores.People;
      const tx = this.#database.transaction([store], 'readwrite');
      if (person.id) {
        await tx.objectStore(store).put(person.serialize(), person.id);
      } else {
        person.id = await tx.objectStore(store).add(person.serialize());
      }
      await tx.complete();
    } catch (err) {
      throw new Error(`Kan inte spara person ”${person}”: ${err.message}.`);
    }
  }

  /**
   * Spara ett krav i databasen.
   *
   * Spara kravuppgifterna och alla ingående kontroller.
   *
   * @param {Requirement} requirement Krav att spara.
   * @param {TypeError} Kravet saknar stickprovs-id.
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async setRequirement(requirement) {
    if (!requirement.sampleID) {
      throw new TypeError('Kan inte spara krav utan stickprovs-id.');
    }
    try {
      const data = requirement.serialize();
      const rStore = Model.#Stores.Requirements;
      const tx = this.#database.transaction([rStore], 'readwrite');
      if (requirement.key) {
        await tx.objectStore(rStore).put(data, requirement.key);
      } else {
        requirement.key = await tx.objectStore(rStore).add(data);
      }
      await tx.complete();
    } catch (err) {
      throw new Error(
        `Kan inte spara stickprov ${requirement}: ${err.message}.`
      );
    }
  }

  /**
   * Spara ett stickprov i databasen.
   *
   * Spara endast stickprovsuppgifterna, inte de de ingående kraven som får
   * sparas separat.
   *
   * @param {Sample} sample Stickprov att spara.
   * @param {TypeError} Stickprovet saknar gransknings-id.
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async setSample(sample) {
    if (!sample.auditID) {
      throw new TypeError('Kan inte spara stickprov utan gransknings-id.');
    }
    try {
      const store = Model.#Stores.Samples;
      const tx = this.#database.transaction([store], 'readwrite');
      if (sample.id) {
        await tx.objectStore(store).put(sample.serialize(), sample.id);
      } else {
        sample.id = await tx.objectStore(store).add(sample.serialize());
      }
      await tx.complete();
    } catch (err) {
      throw new Error(`Kan inte spara stickprov ${sample}: ${err.message}.`);
    }
  }

  /**
   * Spara en tillsynsplan i databasen.
   *
   * @param {Schedule} schedule Tillsynsplan att spara.
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async setSchedule(schedule) {
    try {
      const store = Model.#Stores.Schedules;
      const tx = this.#database.transaction([store], 'readwrite');
      const obj = tx.objectStore(store);
      if (schedule.id) {
        await obj.put(schedule.serialize(), schedule.id);
      } else {
        schedule.id = await obj.add(schedule.serialize());
      }
      await tx.complete();
    } catch (err) {
      throw new Error(
        `Kan inte spara tillsynsplan ${schedule}: ${err.message}.`
      );
    }
  }

  /**
   * Återskapa ett ärende från ett JSON-objekt.
   *
   * Lagra ärendet och dess innehåll i respektive objektlager.
   *
   * @param {object} data Dataobjekt att återskapa ifrån.
   * @return {AuditCase} Ärendeobjektet.
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async unserialize(data) {
    const aStore = Model.#Stores.Cases;
    const stores = [
      aStore,
      Model.#Stores.Audits,
      Model.#Stores.Entries,
      Model.#Stores.Requirements,
      Model.#Stores.Samples,
    ];
    try {
      const tx = this.#database.transaction(stores, 'readwrite');
      const aCase = CaseFactory.build(data);
      aCase.id = await tx.objectStore(aStore).add(aCase.serialize());
      for (const entryObj of data.entries ?? []) {
        await this.#restoreEntry(tx, aCase, entryObj);
      }
      for (const auditObj of data.audits ?? []) {
        await this.#restoreAudit(tx, aCase, auditObj);
      }
      await tx.complete();
      return aCase;
    } catch (err) {
      throw new Error(`Kan inte återskapa ärende ${data.id}: ${err.message}.`);
    }
  }

  /**
   * Radera alla granskningar som hör till angivet ärende.
   *
   * @private
   * @param {Transaction} tx Databastransaktion.
   * @param {number}      id Ärendeidentitet.
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async #deleteAudits(tx, id) {
    const store = tx.objectStore(Model.#Stores.Audits);
    const index = store.index(Model.#Indices.AuditsByCase);
    const cursor = index.openCursor(id);
    for await (const record of cursor) {
      await this.#deleteSamples(tx, record.primaryKey);
      await record.delete();
    }
  }

  /**
   * Radera alla loggnoteringar som hör till angivet ärende.
   *
   * @private
   * @param {Transaction} tx Databastransaktion.
   * @param {number}      id Ärendeidentitet.
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async #deleteEntries(tx, id) {
    const store = tx.objectStore(Model.#Stores.Entries);
    const index = store.index(Model.#Indices.EntriesByCase);
    const cursor = index.openCursor(id);
    for await (const record of cursor) {
      await record.delete();
    }
  }

  /**
   * Radera alla krav som hör till angivet stickprov.
   *
   * @private
   * @param {Transaction} tx Databastransaktion.
   * @param {number}      id Stickprovsidentitet.
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async #deleteRequirements(tx, id) {
    const store = tx.objectStore(Model.#Stores.Requirements);
    const index = store.index(Model.#Indices.RequirementsBySample);
    const cursor = index.openCursor(id);
    for await (const record of cursor) {
      await record.delete();
    }
  }

  /**
   * Radera alla stickprov som hör till angiven granskning.
   *
   * @private
   * @param {Transaction} tx Databastransaktion.
   * @param {number}      id Granskningsidentitet.
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async #deleteSamples(tx, id) {
    const store = tx.objectStore(Model.#Stores.Samples);
    const index = store.index(Model.#Indices.SamplesByAudit);
    const cursor = index.openCursor(id);
    for await (const record of cursor) {
      this.#deleteRequirements(tx, record.primaryKey);
      await record.delete();
    }
  }

  /**
   * Populera en granskning med stickprov.
   *
   * @private
   * @param {Audit}       audit       Granskning att populera.
   * @param {Transaction} tx          Databastransaktion att använda.
   * @param {boolean}     [recursive] Populera stickproven rekursivt?
   */
  async #populateAudit(audit, tx, recursive = false) {
    const sIndex = Model.#Indices.SamplesByAudit;
    const sStore = Model.#Stores.Samples;
    const index = await tx.objectStore(sStore).index(sIndex);
    const cursor = index.openCursor(audit.id);
    const samples = [];
    for await (const record of cursor) {
      const { value } = record;
      value.id = record.primaryKey;
      samples.push(value);
    }
    const selectFunctions = [
      (d) => 'Component' === d.class, // Populera komponenter först.
      (d) => 'Component' !== d.class,
    ];
    for (const select of selectFunctions) {
      for (const info of samples ?? []) {
        if (!select(info)) continue;
        const sample = SampleFactory.build(audit.id, info);
        sample.id = info.id;
        audit.setSample(sample);
        if (recursive) {
          await this.#populateSample(sample, tx, true);
        }
      }
    }
  }

  /**
   * Populera ett stickprov med krav.
   *
   * @private
   * @param {sample}      sample      Stickprov att populera.
   * @param {Transaction} tx          Databastransaktion att använda.
   * @param {boolean}     [recursive] Populera stickproven rekursivt?
   */
  async #populateSample(sample, tx, recursive = false) {
    const rIndex = Model.#Indices.RequirementsBySample;
    const rStore = Model.#Stores.Requirements;
    const index = await tx.objectStore(rStore).index(rIndex);
    const cursor = index.openCursor(sample.id);
    const reqs = [];
    for await (const record of cursor) {
      const { value } = record;
      value.key = record.primaryKey;
      reqs.push(value);
    }
    for (const info of reqs ?? []) {
      const req = new Requirement(sample.id, info);
      req.key = info.key;
      sample.setRequirement(req);
    }
  }

  /**
   * Återskapa en granskning från JSON-data.
   *
   * Spara granskningen i databasen och lägg till den i ärendet.
   * Återskapa sedan dess innehåll.
   *
   * Komponenter behöver återskapas först, eftersom de måste finnas för att
   * kunna läggas till i sammansatta stickprov.
   *
   * @param {Transaction} tx    Databastransaktion.
   * @param {AuditCase}   aCase Ärende,
   * @param {object}      data  Dataobjekt att återskapa ifrån.
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async #restoreAudit(tx, aCase, data) {
    try {
      const audit = new Audit(aCase.id, data);
      const store = Model.#Stores.Audits;
      audit.id = await tx.objectStore(store).add(audit.serialize());
      aCase.setAudit(audit);
      const selectFunctions = [
        (d) => 'Component' === d.class, // Populera komponenter först.
        (d) => 'Component' !== d.class,
      ];
      for (const select of selectFunctions) {
        for (const sample of data.samples ?? []) {
          if (!select(sample)) continue;
          await this.#restoreSample(tx, audit, sample);
        }
      }
    } catch (err) {
      throw new Error(`Kan inte återskapa granskning: ${err.message}.`);
    }
  }

  /**
   * Återskapa en loggnotering från JSON-data.
   *
   * Spara noteringen i databasen och lägg till den i ärendet.
   *
   * @param {Transaction} tx    Databastransaktion.
   * @param {AuditCase}   aCase Ärende,
   * @param {object}      data  Dataobjekt att återskapa ifrån.
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async #restoreEntry(tx, aCase, data) {
    try {
      const entry = new LogEntry(aCase.id, data);
      const store = Model.#Stores.Entries;
      entry.id = await tx.objectStore(store).add(entry.serialize());
      aCase.setEntry(entry);
    } catch (err) {
      throw new Error(`Kan inte återskapa loggnotering: ${err.message}.`);
    }
  }

  /**
   * Återskapa ett krav från JSON-data.
   *
   * Spara kravet i databasen och återskapa sedan dess innehåll.
   *
   * @param {Transaction} tx     Databastransaktion.
   * @param {Sample}      sample Stickprov,
   * @param {object}      data   Dataobjekt att återskapa ifrån.
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async #restoreRequirement(tx, sample, data) {
    try {
      const req = new Requirement(sample.id, data);

      // Sätt beroende i kravet för att kunna serialisera.
      // (Anropet kommer att misslyckas pga avsaknad av id.)
      try {
        sample.setRequirement(req);
      } catch (ignore) {}

      const store = Model.#Stores.Requirements;
      req.id = await tx.objectStore(store).add(req.serialize());
      sample.setRequirement(req);
    } catch (err) {
      throw new Error(`Kan inte återskapa krav: ${err.message}.`);
    }
  }

  /**
   * Återskapa ett stickprov från JSON-data.
   *
   * Spara stickprovet i databasen och återskapa sedan dess innehåll.
   *
   * @param {Transaction} tx    Databastransaktion.
   * @param {Audit}       audit Granskning,
   * @param {object}      data  Dataobjekt att återskapa ifrån.
   * @throws {Error} Databastransaktionen misslyckades.
   */
  async #restoreSample(tx, audit, data) {
    try {
      const sample = SampleFactory.build(audit.id, data);
      for (const { name } of sample.pending ?? []) {
        sample.addComponent(audit.getSampleByName(name));
      }
      const store = Model.#Stores.Samples;
      sample.id = await tx.objectStore(store).add(sample.serialize());
      audit.setSample(sample);
      for (const req of data.req ?? []) {
        await this.#restoreRequirement(tx, sample, req);
      }
    } catch (err) {
      throw new Error(`Kan inte återskapa stickprov: ${err.message}.`);
    }
  }
}

// Importera beroenden.
import { Audit } from './Audit.js';
import { CaseFactory } from './case.js';
import { LogEntry } from './LogEntry.js';
import { Person } from './Person.js';
import { Requirement } from './Requirement.js';
import { SampleFactory } from './sample.js';
import { Schedule } from './Schedule.js';
