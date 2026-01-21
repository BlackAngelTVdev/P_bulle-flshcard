import vine from '@vinejs/vine'
const teacherValidator = vine.compile(
    vine.object({
        // Utilisation d'un enum pour le genre
        gender: vine.enum(['woman', 'man', 'other'] as const),
        firstname: vine.string().trim().minLength(2),
        lastname: vine.string().trim().minLength(2),
        nickname: vine.string().trim().minLength(2),
        origine: vine.string().trim().minLength(2),
        sectionId: vine.number().positive(),
    })
)
export { teacherValidator }