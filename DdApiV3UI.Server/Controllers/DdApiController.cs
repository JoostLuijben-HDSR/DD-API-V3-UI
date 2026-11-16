using DdApiV3UI.Server.Models;
using DigitaleDelta.CsdlParser;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Headers;

namespace DdApiV3UI.Server.Controllers
{
	[ApiController]
	[Route("[controller]")]
	public class DdApiController(IConfiguration configuration) : ControllerBase
	{
		private List<string> AllowedBaseUrls => configuration.GetSection("BaseUrls").Get<List<string>>() ?? [];

		private ObjectResult UrlNotAllowed() => BadRequest(new
		{
			error = new
			{
				code = "UrlNotAllowed",
				message = "This server only forwards requests to the configured base URLs."
			}
		});

        [Route("appsettings")]
        [HttpGet]
        public ActionResult<AppSettings> GetDefaultsAsync()
        {
            return Ok(new AppSettings
            {
                BaseUrls = configuration.GetSection("BaseUrls").Get<List<string>>() ?? [],
                EndPoints = configuration.GetSection("EndPoints").Get<List<EndPoint>>() ?? []
            });
        }

        [Route("metadata")]
		[HttpPost]
		public async Task<ActionResult<IEnumerable<CsdlProperty>>> GetMetaDataAsync([FromBody] RequestParameters requestParameters)
		{
			var metaDataUrl = $"{requestParameters.Url}/$metadata"; // Examine the $metadata manifest.
			if (!UrlAllowList.IsAllowed(metaDataUrl, AllowedBaseUrls))
			{
				return UrlNotAllowed();
			}

			var client      = new HttpClient();
			var metaDataUri = new Uri(metaDataUrl);
			var response    = await client.GetAsync(metaDataUri).ConfigureAwait(false);
			var metaData    = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

            var result = Enumerable.Empty<CsdlProperty>();

            if (CsdlParser.TryParse(metaData, out var csdlModel, out var errorString)) {

				if (csdlModel != null && requestParameters.EndPoint != null)
				{
                    result = CsdlFlattener.FlattenEntityProperties(csdlModel, requestParameters.EndPoint);
                }
            }

			return Ok(result);
        }

		
		[Route("")]
		[HttpPost]
		public async Task<ActionResult<string>> GetAsync([FromBody] RequestParameters requestParameters)
		{
			try
			{
				var queryUrl = requestParameters.Url;
				if (string.IsNullOrEmpty(queryUrl))
				{
					return BadRequest();
				}

				if (!UrlAllowList.IsAllowed(queryUrl, AllowedBaseUrls))
				{
					return UrlNotAllowed();
				}

				var queryUri = new Uri(queryUrl);
				var client   = new HttpClient();			

				var request = new HttpRequestMessage(HttpMethod.Get, queryUri);

				if (requestParameters.ApiKey != null)
				{
                    request.Headers.Add("X-API-KEY", requestParameters.ApiKey);
                }

				if (requestParameters.CoordinateSystem != null)
				{
					request.Headers.Add("Accept-Crs", requestParameters.CoordinateSystem);
				}

				var response = await client.SendAsync(request);					
				return Ok(await response.Content.ReadAsStringAsync());
			}
			catch (Exception e)
			{
				throw new Exception(e.ToString());
			}
		}
	}
}
