export type NormalizeDateLevel =
  | "milliseconds"
  | "seconds"
  | "minutes"
  | "hours";

export function normalizedDate(
  date: Date | number | string,
  level: NormalizeDateLevel = "milliseconds",
) {
  const newDate =
    date instanceof Date ? new Date(date.getTime()) : new Date(date);

  newDate.setMilliseconds(0);

  switch (level) {
    case "seconds":
      newDate.setSeconds(0);
      break;
    case "minutes":
      newDate.setMinutes(0);
      newDate.setSeconds(0);
      break;
    case "hours":
      newDate.setHours(0);
      newDate.setMinutes(0);
      newDate.setSeconds(0);
      break;
  }

  return newDate;
}

export function formatDate(date: Date | number | string) {
  const newDate =
    date instanceof Date ? new Date(date.getTime()) : new Date(date);
  return formatters.dFormat.format(newDate);
}

export function formatTime(date: Date | number | string) {
  const newDate =
    date instanceof Date ? new Date(date.getTime()) : new Date(date);
  return formatters.tFormat.format(newDate);
}

export function formatDateTime(date: Date | number | string) {
  const newDate =
    date instanceof Date ? new Date(date.getTime()) : new Date(date);
  return formatters.dtFormat.format(newDate);
}

export function formatOdoo(date: Date) {
  return date.toISOString().replace("T", " ").substring(0, 19);
}

export function parseOdoo(date: string) {
  return new Date(`${date.replace(" ", "T")}.000Z`);
}

export function computeYYYYMMDD(date: Date, timeZone: string) {
  return parseInt(
    Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(date)
      .replaceAll("-", ""),
    10,
  );
}

const formatters = {
  dFormat: new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: undefined,
    minute: undefined,
    hour12: false,
  }),
  tFormat: new Intl.DateTimeFormat("es-ES", {
    day: undefined,
    month: undefined,
    year: undefined,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }),

  dtFormat: new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }),

  setTimezone: (timezone: string) => {
    formatters.tFormat = new Intl.DateTimeFormat("es-ES", {
      timeZone: timezone,
      day: undefined,
      month: undefined,
      year: undefined,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    formatters.dFormat = new Intl.DateTimeFormat("es-ES", {
      timeZone: timezone,
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: undefined,
      minute: undefined,
      hour12: false,
    });
    formatters.dtFormat = new Intl.DateTimeFormat("es-ES", {
      timeZone: timezone,
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  },
};
