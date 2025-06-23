import {
	IsEmail,
	IsNotEmpty,
	IsOptional,
	IsString,
	MinLength,
	Validate,
	ValidationArguments,
	ValidatorConstraint,
	ValidatorConstraintInterface
} from 'class-validator'

// Кастомный валидатор: хотя бы одно поле должно быть заполнено
@ValidatorConstraint({ name: 'atLeastOneField', async: false })
class AtLeastOneFieldConstraint implements ValidatorConstraintInterface {
	validate(_: any, args: ValidationArguments) {
		const obj = args.object as any
		return !!(obj.email || obj.displayName)
	}

	defaultMessage(args: ValidationArguments) {
		return 'Должен быть указан либо email, либо displayName.'
	}
}

export class LoginDto {
	@Validate(AtLeastOneFieldConstraint)
	// Валидатор применяется к всему классу (не к полю)
	@IsOptional()
	@IsString({ message: 'Email должен быть строкой.' })
	@IsEmail({}, { message: 'Некорректный формат email.' })
	email?: string

	@IsOptional()
	@IsString({ message: 'displayName должен быть строкой.' })
	name?: string

	@IsString({ message: 'Пароль должен быть строкой.' })
	@IsNotEmpty({ message: 'Поле пароль не может быть пустым.' })
	@MinLength(6, { message: 'Пароль должен содержать не менее 6 символов.' })
	password: string
}
