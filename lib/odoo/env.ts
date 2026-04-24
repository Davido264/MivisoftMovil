import { Odoo } from "@/lib/odoo/_env";

export type RemoteActivityRegistry = {
  id: number;
  job_registry_id: number;
  activity_id: number;
  lat: number;
  lng: number;
  observation: string;
  uid: number;
  lastmod: Date;
  write_date: Date;
};

export type RemoteActivity = {
  id: number;
  itinerary_id: number;
  name: string;
};

export type RemoteItinerary = {
  id: number;
  name: string;
};

export type RemoteVehicle = {
  id: number;
  company_ids: number[];
  name: string;
  municipal_registry: string;
  unit_number: number;
};

export type RemoteCompany = {
  id: number;
  name: string;
};

export type RemoteJobReg = {
  id: number;
  itinerary_id: number;
  user_id: number;
  start_datetime: string;
  end_datetime?: string;
  observation: string;
  score?: number;
  fleet_vehicle_id: number;
  company_id: number;
  lastmod: Date;
  create_date: undefined;
  write_date: undefined;
};

export type RemoteTaskRegistry = {
  id: number;
  completed: boolean;
  completed_date: string | false;
  observation: string;
  task_id: number;
  activity_registry_id: number;
  uid: number;
  lastmod: Date;
  write_date: undefined;
};

export type RemoteTask = {
  id: number;
  activity_id: number;
  name: string;
};

export type RemoteUser = {
  id: number;
  name: string;
  company: string;
  tz: string;
  groups_id: number;
  company_id: undefined;
};

export type RemoteWorktimeRegistry = {
  id: number;
  user_id: number;
  day: number;
  serial: number;
  start_datetime: string;
  end_datetime: string | boolean;
  start_lat: number;
  start_lng: number;
  end_lat: number | boolean;
  end_lng: number | boolean;
  observation: string;
  lastmod: Date;
  job_registry_ids: any[][] | undefined;
};

export type Env = {
  ["res.partner"]: {
    id: number;
    name: string;
    email: string;
  };
  ["technical_support.activity_registry"]: RemoteActivityRegistry;
  ["technical_support.activity"]: RemoteActivity;
  ["technical_support.itinerary"]: RemoteItinerary;
  ["res.company"]: RemoteCompany;
  ["fleet.vehicle"]: RemoteVehicle;
  ["technical_support.job_registry"]: RemoteJobReg;
  ["technical_support.task_registry"]: RemoteTaskRegistry;
  ["technical_support.task"]: RemoteTask;
  ["res.users"]: RemoteUser;
  ["technical_support.worktime_registry"]: RemoteWorktimeRegistry;
  ["technical_support.time_window"]: {
    id: number;
    worktime_registry_id: undefined;
    serial: undefined;
    start_datetime: undefined;
    end_datetime: undefined;
    start_lat: undefined;
    start_lng: undefined;
    end_lat: undefined;
    end_lng: undefined;
    observation: undefined;
    write_date: undefined;
  };
};

export const odoo = new Odoo<Env>(
  // { baseUrl: "https://its.mivilsoft.com", port: 443, db: "QuitoOdooDB" },
  { baseUrl: "https://44.218.54.13", port: 443, db: "QuitoOdooDB" },
  [
    "res.partner",
    "technical_support.activity_registry",
    "technical_support.activity",
    "technical_support.itinerary",
    "res.company",
    "fleet.vehicle",
    "technical_support.job_registry",
    "technical_support.task_registry",
    "technical_support.task",
    "res.users",
    "technical_support.worktime_registry",
    "technical_support.time_window",
  ],
);

// this combined with abortcontroller and OAuth and I make a new library for interacting w/odoo via js/ts
//
