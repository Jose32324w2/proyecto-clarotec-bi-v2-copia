import re  # Importa re
from django.core.exceptions import ValidationError  # Importa ValidationError
from django.utils.translation import gettext as _  # Importa gettext


class CustomComplexPasswordValidator:
    """
    Valida que la contraseña cumpla con:
    - Longitud: 12-15 caracteres.
    - Contenga al menos una mayúscula, una minúscula, un dígito y un símbolo.
    - Puede contener espacios.
    """

    def validate(self, password, user=None):
        # 1. Longitud (12-15)
        if not (12 <= len(password) <= 15):
            raise ValidationError(
                _("La contraseña debe tener entre 12 y 15 caracteres."),
                code='password_length'
            )

        # 2. Mayúscula
        if not re.search(r'[A-Z]', password):
            raise ValidationError(
                _("La contraseña debe contener al menos una letra mayúscula."),
                code='password_no_upper'
            )

        # 3. Minúscula
        if not re.search(r'[a-z]', password):
            raise ValidationError(
                _("La contraseña debe contener al menos una letra minúscula."),
                code='password_no_lower'
            )

        # 4. Dígito
        if not re.search(r'\d', password):
            raise ValidationError(
                _("La contraseña debe contener al menos un número."),
                code='password_no_digit'
            )

        # 5. Símbolo (incluyendo el guion bajo y espacio que el frontend acepta)
        # Usamos [\W_] para coincidir con el regex del frontend: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{12,15}$/
        if not re.search(r'[\W_]', password):
            raise ValidationError(
                _("La contraseña debe contener al menos un símbolo especial."),
                code='password_no_symbol'
            )

    def get_help_text(self):
        return _(
            "Tu contraseña debe tener entre 12 y 15 caracteres, "
            "incluir mayúsculas, minúsculas, números y símbolos especiales."
        )
