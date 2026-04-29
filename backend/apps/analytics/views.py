from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from services.analytics_service import analytics_overview


class AnalyticsOverviewView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        range_days = int(request.query_params.get('range_days', 30))
        date_from = request.query_params.get('from')
        date_to = request.query_params.get('to')
        data = analytics_overview(
            organization=request.user.organization,
            date_from=date_from,
            date_to=date_to,
            range_days=range_days,
        )
        return Response(data)
