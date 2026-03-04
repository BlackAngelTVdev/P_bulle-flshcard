import { SimpleMessagesProvider } from '@vinejs/vine'

export const frMessages = new SimpleMessagesProvider({

  'required': 'Le champ {{ field }} est obligatoire',
  'string': 'Le champ {{ field }} doit être du texte',
  'number': 'Le champ {{ field }} doit être un nombre',
  'email': 'L\'adresse email n\'est pas valide',
  

  'minLength': 'Le champ {{ field }} doit faire au moins {{ min }} caractères',
  'maxLength': 'Le champ {{ field }} ne doit pas dépasser {{ max }} caractères',
  

  'database.unique': 'Cette valeur est déjà utilisée pour le champ {{ field }}',
  'confirmed': 'La confirmation du mot de passe ne correspond pas',
  

  'fields.username': 'nom d\'utilisateur',
  'fields.email': 'adresse email',
  'fields.password': 'mot de passe',
  'fields.password_confirmation': 'confirmation du mot de passe',
  'fields.name': 'nom du deck',
  'fields.question': 'question',
  'fields.answer': 'réponse',
})