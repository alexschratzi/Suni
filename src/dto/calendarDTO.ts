export interface CalendarEntryDTO {
    title: string,
    id: string,
    user_id: string
    title_short:string
    ical_id?:string
    date: Date
}

export interface Calendar {
    entries: CalendarEntryDTO[]
}