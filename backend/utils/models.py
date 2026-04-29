from django.db import models

class OrgQuerySet(models.QuerySet):
    def for_org(self, organization):
        return self.filter(organization=organization)

class BaseOrgModel(models.Model):
    organization = models.ForeignKey('authapp.Organization', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = OrgQuerySet.as_manager()

    class Meta:
        abstract = True
