// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_faithful_stellaris.sql';
import m0001 from './0001_workable_rocket_raccoon.sql';
import m0002 from './0002_fuzzy_kinsey_walden.sql';
import m0003 from './0003_old_menace.sql';
import m0004 from './0004_workable_iron_patriot.sql';
import m0005 from './0005_lazy_ozymandias.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003,
m0004,
m0005
    }
  }
  