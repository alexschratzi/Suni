
export interface UniCourse {
    title: string, 
    desc?: string, 
    sws?: number,
    ects?: number,
    exam_date?: Date,
    grade?: string,
    try_nr?: number,
    semester?: string
}
export interface  StudyProgram {
    university_id: string,
    title: string,
    start_date?: Date,
    graduated_date?: Date,
    courses: UniCourse[],
    status?: string,
    person_nr?: string,
}

export interface StudentProfile {
    name: string,
    surname: string,
    title_pre?: string,
    title_post?: string,
    matrikel_nr?: string,
    
    university_id: string,
    current_semester?: string,
    
    calendar_url?: string,
    study_programs: StudyProgram[],
}


