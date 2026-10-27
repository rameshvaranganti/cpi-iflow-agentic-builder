export function generateScenarioIflw(iflowId: string, iflowName: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL"
                   xmlns:ifl="http://sap.com/xi/content/iflow"
                   id="Definitions_${iflowId}"
                   targetNamespace="http://sap.com/xi/content/iflow">
  <bpmn2:collaboration id="Collaboration_1" name="${iflowName}">
    <bpmn2:participant id="Participant_Sender" name="ERP_Source" processRef="Process_Sender"/>
    <bpmn2:participant id="Participant_Integration" name="IntegrationProcess" processRef="Process_Main"/>
    <bpmn2:participant id="Participant_Receiver" name="Target_System" processRef="Process_Receiver"/>
    <bpmn2:messageFlow id="MsgFlow_Inbound" sourceRef="Participant_Sender" targetRef="StartEvent_Inbound">
      <bpmn2:extensionElements>
        <ifl:property key="ComponentType" value="IDOC"/>
        <ifl:property key="address" value="{{IDOC_SENDER_ADDRESS}}"/>
      </bpmn2:extensionElements>
    </bpmn2:messageFlow>
    <bpmn2:messageFlow id="MsgFlow_Outbound" sourceRef="EndEvent_Outbound" targetRef="Participant_Receiver">
      <bpmn2:extensionElements>
        <ifl:property key="ComponentType" value="SFTP"/>
        <ifl:property key="host" value="{{SFTP_HOST}}"/>
        <ifl:property key="fileDirectory" value="{{SFTP_TARGET_DIRECTORY}}"/>
        <ifl:property key="fileName" value="{{TARGET_FILE_NAME_PATTERN}}"/>
      </bpmn2:extensionElements>
    </bpmn2:messageFlow>
  </bpmn2:collaboration>
  <bpmn2:process id="Process_Main" name="Main Ingress" isExecutable="true">
    <bpmn2:startEvent id="StartEvent_Inbound" name="Inbound Trigger">
      <bpmn2:outgoing>Flow_1</bpmn2:outgoing>
    </bpmn2:startEvent>
    <bpmn2:callActivity id="CallActivity_Core" name="Execute Local Processing">
      <bpmn2:extensionElements>
        <ifl:property key="activityType" value="ProcessCall"/>
        <ifl:property key="processId" value="Sub_Process_Core"/>
      </bpmn2:extensionElements>
      <bpmn2:incoming>Flow_1</bpmn2:incoming>
      <bpmn2:outgoing>Flow_2</bpmn2:outgoing>
    </bpmn2:callActivity>
    <bpmn2:endEvent id="EndEvent_Main" name="Done">
      <bpmn2:incoming>Flow_2</bpmn2:incoming>
    </bpmn2:endEvent>
    <bpmn2:sequenceFlow id="Flow_1" sourceRef="StartEvent_Inbound" targetRef="CallActivity_Core"/>
    <bpmn2:sequenceFlow id="Flow_2" sourceRef="CallActivity_Core" targetRef="EndEvent_Main"/>
  </bpmn2:process>
  <bpmn2:process id="Sub_Process_Core" name="Sub_Process_Core" isExecutable="false">
    <bpmn2:extensionElements>
      <ifl:property key="processType" value="directSubProcess"/>
    </bpmn2:extensionElements>
    <bpmn2:startEvent id="StartEvent_Sub" name="Start">
      <bpmn2:outgoing>SubFlow_1</bpmn2:outgoing>
    </bpmn2:startEvent>
    <bpmn2:callActivity id="CallActivity_Log" name="Log Payload to MPL">
      <bpmn2:extensionElements>
        <ifl:property key="activityType" value="Script"/>
        <ifl:property key="script" value="LogPayload.groovy"/>
      </bpmn2:extensionElements>
      <bpmn2:incoming>SubFlow_1</bpmn2:incoming>
      <bpmn2:outgoing>SubFlow_2</bpmn2:outgoing>
    </bpmn2:callActivity>
    <bpmn2:endEvent id="EndEvent_Outbound" name="Send Target File">
      <bpmn2:incoming>SubFlow_2</bpmn2:incoming>
      <bpmn2:messageEventDefinition id="MsgEventDef_1"/>
    </bpmn2:endEvent>
    <bpmn2:sequenceFlow id="SubFlow_1" sourceRef="StartEvent_Sub" targetRef="CallActivity_Log"/>
    <bpmn2:sequenceFlow id="SubFlow_2" sourceRef="CallActivity_Log" targetRef="EndEvent_Outbound"/>
  </bpmn2:process>
</bpmn2:definitions>`;
}

export function generateParametersPropdef(customParams?: Record<string, string>): string {
  const defaults: Record<string, string> = {
    IDOC_SENDER_ADDRESS: '/idoc/ORDERS05',
    SFTP_HOST: 'sftp.enterprise.domain.com',
    SFTP_PORT: '22',
    SFTP_CREDENTIAL_ALIAS: 'SFTP_CREDENTIALS',
    SFTP_TARGET_DIRECTORY: '/outbound/orders',
    TARGET_FILE_NAME_PATTERN: 'ORDERS_${date:now:yyyyMMddHHmmss}.csv'
  };
  const merged = { ...defaults, ...customParams };

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<parameters>\n';
  for (const [k, v] of Object.entries(merged)) {
    xml += `  <param><name>${k}</name><type>xsd:string</type><value>${v}</value><category>Adapter</category></param>\n`;
  }
  xml += '</parameters>';
  return xml;
}

export const orders05XsltContent = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="text" encoding="UTF-8"/>
  <xsl:template match="/">
    <xsl:text>IDOC_NUM,PO_NUM,LINE_ITEM,MATERIAL,QTY&#10;</xsl:text>
    <xsl:for-each select="//*:E1EDP01">
      <xsl:value-of select="string(//*:EDI_DC40/*:DOCNUM)"/><xsl:text>,</xsl:text>
      <xsl:value-of select="string(//*:E1EDK02[*:QUALF='001']/*:BELNR)"/><xsl:text>,</xsl:text>
      <xsl:value-of select="string(*:POSEX)"/><xsl:text>,</xsl:text>
      <xsl:value-of select="string(*:E1EDP19/*:IDTNR)"/><xsl:text>,</xsl:text>
      <xsl:value-of select="string(*:MENGE)"/><xsl:text>&#10;</xsl:text>
    </xsl:for-each>
  </xsl:template>
</xsl:stylesheet>`;

export const logPayloadGroovyContent = `package script
import com.sap.gateway.ip.core.customdev.util.Message
def Message processData(Message message) {
    def body = message.getBody(String)
    def log = messageLogFactory.getMessageLog(message)
    if (log != null && body) {
        log.addAttachmentAsString("Inbound_Payload", body, "application/xml")
    }
    return message
}`;

export const exceptionHandlerGroovyContent = `package script
import com.sap.gateway.ip.core.customdev.util.Message
def Message processData(Message message) {
    def ex = message.getProperties().get("CamelExceptionCaught") as Exception
    def log = messageLogFactory.getMessageLog(message)
    if (log != null && ex != null) {
        StringWriter sw = new StringWriter()
        ex.printStackTrace(new PrintWriter(sw))
        log.addAttachmentAsString("Exception_StackTrace", sw.toString(), "text/plain")
        log.setStringProperty("Failure_RootCause", ex.getMessage() ?: "Unspecified error")
    }
    return message
}`;