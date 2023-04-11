import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

type ValidityCheckReturnType = (
  object: unknown,
  propertyName: string,
) => void;

/**
 * Creates a new decorator for phone number validation.
 * @param {Function} handler - validation method
 * @param {ValidationOptions} params.validationOptions - The whole validation data.
 * @returns {ValidityCheckReturnType}
 */
export function ValidityCheck(
  handler: (value: unknown, object: unknown, propertyName: string, targetName:string) => ({message?:string, isValid:boolean}),
  validationOptions?: ValidationOptions,
): ValidityCheckReturnType {
  return (object: Record<string, unknown>, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [handler],
      validator: ValidityCheckConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'ValidityCheck' })
/**
 * Creates a new decorator for applying {ValidityCheck} constraint.
 */
export class ValidityCheckConstraint implements ValidatorConstraintInterface {
  message: string;

  /**
   * Validate the provided value.
   * @param {unknown} value The value of the field.
   * @param {ValidationArguments} args Additional validation arguments.
   * @returns {boolean}
   */
  validate(value: unknown, args: ValidationArguments): boolean {
    const [handler] = args.constraints;
    const {message, isValid} = handler(value, args.object, args.property, args.targetName);
    this.message = message;
    return isValid;
  }

  /**
   * Gets default message when validation for this constraint fail.
   * @returns {boolean}
   */
  defaultMessage(): string {
    return this.message;
  }
}
