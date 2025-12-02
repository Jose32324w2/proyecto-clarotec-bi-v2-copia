# backend/usuarios/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django import forms # Importamos los formularios de Django
from .models import User, Roles

# Ya no necesitamos UserCreationForm ni UserChangeForm de django.contrib.auth.forms

class UserAdminCreationForm(forms.ModelForm):
    """
    Un formulario para crear nuevos usuarios. No hereda de UserCreationForm.
    """
    password = forms.CharField(widget=forms.PasswordInput)
    password2 = forms.CharField(label='Password confirmation', widget=forms.PasswordInput)

    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'rol')

    def clean_password2(self):
        # Valida que las dos contraseñas coincidan.
        password = self.cleaned_data.get("password")
        password2 = self.cleaned_data.get("password2")
        if password and password2 and password != password2:
            raise forms.ValidationError("Passwords don't match")
        return password2

    def save(self, commit=True):
        # Guarda el nuevo usuario y hashea la contraseña.
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password"])
        if commit:
            user.save()
        return user

class UserAdmin(BaseUserAdmin):
    # Usa nuestro nuevo formulario de creación.
    add_form = UserAdminCreationForm

    # La configuración para la VISTA DE LISTA (correcta)
    list_display = ('email', 'first_name', 'last_name', 'is_staff', 'rol')
    
    # La configuración para la VISTA DE EDICIÓN (correcta)
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'rol')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    # La configuración para la VISTA DE CREACIÓN (correcta)
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'rol', 'password', 'password2'),
        }),
    )
    
    search_fields = ('email',)
    ordering = ('email',)
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'rol')


# Registra los modelos
admin.site.register(Roles)
admin.site.register(User, UserAdmin)